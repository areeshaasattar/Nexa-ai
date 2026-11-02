'use client';

import { trpc } from '@/trpc/client';
import { 
  StreamVideo, 
  StreamCall, 
  StreamTheme, 
  StreamVideoClient,
  Call,
} from '@stream-io/video-react-sdk';
import { useEffect, useState, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { CallConnect } from './call-connect';

interface StreamCallProviderProps {
  children: ReactNode;
  meetingId: string;
}

export const StreamCallProvider = ({ children, meetingId }: StreamCallProviderProps) => {
  const { data: token, isLoading: isTokenLoading } = trpc.meetings.getToken.useQuery();
  const { data: session, isLoading: isSessionLoading } = trpc.meetings.getSession.useQuery();
  const { data: meeting, isLoading: isMeetingLoading } = trpc.meetings.getOne.useQuery({ id: meetingId });
  const createCallMutation = trpc.meetings.createCall.useMutation();

  const [videoClient, setVideoClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<Call | null>(null);

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

    setVideoClient(client);

    return () => {
      setVideoClient(null);
    };
  }, [token, session, apiKey]);

  useEffect(() => {
    if (!videoClient || !meetingId) return;

    const initCall = async () => {
      try {
        await createCallMutation.mutateAsync({ id: meetingId });
        const newCall = videoClient.call('default', meetingId);
        await newCall.getOrCreate();
        setCall(newCall);
      } catch (error) {
        console.error('Failed to initialize call:', error);
      }
    };

    initCall();

    return () => {
      call?.leave();
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
