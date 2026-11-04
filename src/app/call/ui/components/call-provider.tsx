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
  const { data: token, isLoading: isTokenLoading } = trpc.meetings.getToken.useQuery({ id: meetingId });
  const { data: session, isLoading: isSessionLoading } = trpc.meetings.getSession.useQuery();
  const { data: meeting, isLoading: isMeetingLoading } = trpc.meetings.getOne.useQuery({ id: meetingId });
  const createCallMutation = trpc.meetings.createCall.useMutation();
  // Stable access to the mutation — tRPC's mutateAsync never changes identity,
  // but `createCallMutation` (the hook-maintained object) does, and putting it
  // in the call-init effect's deps would re-create the call on every render.
  const createCallRef = useRef(createCallMutation.mutateAsync);
  useEffect(() => {
    createCallRef.current = createCallMutation.mutateAsync;
  });

  const [videoClient, setVideoClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  // Ref mirror of `call` so the cleanup never has to depend on state.
  const callRef = useRef<Call | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY!;

  useEffect(() => {
    if (!token || !session?.user || !apiKey) return;

    const userImage = /^data:/i.test(session.user.image ?? '')
      ? undefined
      : session.user.image ?? undefined;

    const client = StreamVideoClient.getOrCreateInstance({
      apiKey,
      user: {
        id: session.user.id,
        name: session.user.name ?? session.user.email,
        image: userImage,
      },
      token,
    });

    // Deferred to a microtask so no setState runs synchronously inside the
    // effect body (react-hooks/set-state-in-effect). Behavior is unchanged:
    // the client is available on the next microtask instead of immediately.
    queueMicrotask(() => setVideoClient(client));

    return () => {
      setVideoClient(null);
    };
  }, [token, session, apiKey]);

  useEffect(() => {
    if (!videoClient || !meetingId) return;

    const initCall = async () => {
      try {
        await createCallRef.current({ id: meetingId });
        const newCall = videoClient.call('default', meetingId);
        await newCall.getOrCreate();
        callRef.current = newCall;
        setCall(newCall);
      } catch (error) {
        console.error('Failed to initialize call:', error);
      }
    };

    initCall();

    return () => {
      callRef.current?.leave();
      callRef.current = null;
      setCall(null);
    };
  }, [videoClient, meetingId]);

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
