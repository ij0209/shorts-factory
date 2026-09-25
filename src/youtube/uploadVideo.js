import { createReadStream } from 'node:fs';
import { google } from 'googleapis';

export async function uploadVideo({
  auth, videoPath, title, description, tags, publishAt,
  categoryId = '27', privacyStatus = 'private', madeForKids = false,
}) {
  if (publishAt && privacyStatus !== 'private') {
    throw new Error('YouTube 예약 공개는 privacyStatus=private 상태에서만 가능합니다.');
  }
  const youtube = google.youtube({ version: 'v3', auth });
  const response = await youtube.videos.insert({
    part: ['snippet', 'status'],
    notifySubscribers: false,
    requestBody: {
      snippet: { title, description, tags, categoryId },
      status: {
        privacyStatus,
        selfDeclaredMadeForKids: madeForKids,
        containsSyntheticMedia: true,
        ...(publishAt ? { publishAt } : {}),
      },
    },
    media: { mimeType: 'video/mp4', body: createReadStream(videoPath) },
  });
  if (!response.data.id) throw new Error('YouTube 응답에 video ID가 없습니다.');
  return response.data;
}
