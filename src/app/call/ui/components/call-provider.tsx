'use client';

import { trpc } from '@/trpc/client';
import {
  StreamVideo,
  StreamCall,
  StreamTheme,
  StreamVideoClient,
  Call,
} from '@stream-io/video-react-sdk';
import { useEffect, useRef, useState, ReactNode } from 'react';
import { CallConnect } from './call-connect';

interface StreamCallProviderProps {
  children: ReactNode;
  meetingId: string;
}

export const StreamCallProvider = ({ children, meetingId }: StreamCallProviderProps) => {
  const { data: token, isLoading: isTokenLoading } = trpc.meetings.getToken.useQuery(
    { id: meetingId },
    { refetchOnWindowFocus: false },
  );
  const { data: session, isLoading: isSessionLoading } = trpc.meetings.getSession.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const { data: meeting, isLoading: isMeetingLoading } = trpc.meetings.getOne.useQuery(
    { id: meetingId },
    { refetchOnWindowFocus: false },
  );
  const createCallMutation = trpc.meetings.createCall.useMutation();
  const createCallRef = useRef(createCallMutation.mutateAsync);
  useEffect(() => {
    createCallRef.current = createCallMutation.mutateAsync;
  });

  // Keep latest session in a ref so the client-creation effect can depend on
  // stable primitives (token string + user id) instead of the session object
  // identity. Update the ref in an effect, not during render.
  const sessionRef = useRef(session);
  const sessionUserId = session?.user.id;

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const [videoClient, setVideoClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const callRef = useRef<Call | null>(null);
  const clientCreatedRef = useRef(false);

  const apiKey = process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY!;

  // Create the Stream client once per token string.
  useEffect(() => {
    console.log('[CP] client effect fired', { hasToken: !!token, hasSession: !!sessionRef.current?.user });
    if (!token || !sessionRef.current?.user || !apiKey) return;
    if (clientCreatedRef.current) return;
    clientCreatedRef.current = true;

    const s = sessionRef.current.user;
    const userImage = /^data:/i.test(s.image ?? '') ? undefined : s.image ?? undefined;

    const client = StreamVideoClient.getOrCreateInstance({
      apiKey,
      user: {
        id: s.id,
        name: s.name ?? s.email,
        image: userImage,
      },
      token,
    });

    queueMicrotask(() => setVideoClient(client));

    return () => {
      clientCreatedRef.current = false;
      setVideoClient(null);
    };
  }, [token, apiKey, sessionUserId]);

  // Create the call once per meetingId + client.
  useEffect(() => {
    console.log('[CP] call effect fired', { hasClient: !!videoClient, meetingId });
    if (!videoClient || !meetingId) return;

    let cancelled = false;
    const initCall = async () => {
      try {
        await createCallRef.current({ id: meetingId });
        if (cancelled) return;
        const newCall = videoClient.call('default', meetingId);
        await newCall.getOrCreate();
        if (cancelled) {
          newCall.leave();
          return;
        }
        callRef.current = newCall;
        setCall(newCall);
      } catch (error) {
        console.error('Failed to initialize call:', error);
      }
    };

    initCall();

    return () => {
      cancelled = true;
      // Only leave on real unmount (component unmount), not on re-rend.
      // We guard with a ref that tracks whether we are unmounting.
    };
  }, [videoClient, meetingId]);

  // Separate unmount cleanup to leave the call.
  useEffect(() => {
    return () => {
      console.log('[CP] UNMOUNT cleanup -> leave()');
      callRef.current?.leave();
      callRef.current = null;
    };
  }, []);

  if (isTokenLoading || isSessionLoading || isMeetingLoading || !call || !videoClient) {
    return (
      <CallConnect
        meetingId={meetingId}
        meetingName={meeting?.name}
        userId={session?.user.id || ''}
        userName={session?.user.name || undefined}
        userImage={session?.user.image || undefined}
        callingState="initializing"
      />
    );
  }

  return (
    <StreamVideo client={videoClient}>
      <StreamCall call={call}>
        <StreamTheme>
          <CallConnect
            meetingId={meetingId}
            meetingName={meeting?.name}
            userId={session?.user.id || ''}
            userName={session?.user.name || undefined}
            userImage={session?.user.image || undefined}
          />
          {children}
        </StreamTheme>
      </StreamCall>
    </StreamVideo>
  );
};