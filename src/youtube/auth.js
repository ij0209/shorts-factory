import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { google } from 'googleapis';
import { getYouTubeConfig } from './config.js';

const SCOPES = [
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
];

async function readToken(tokenPath) {
  try { return JSON.parse(await readFile(tokenPath, 'utf8')); }
  catch (error) {
    if (error.code === 'ENOENT') return null;
    throw new Error(`YouTube token을 읽을 수 없습니다: ${error.message}`);
  }
}

async function saveToken(tokenPath, tokens) {
  const existing = await readToken(tokenPath) ?? {};
  await writeFile(tokenPath, `${JSON.stringify({ ...existing, ...tokens }, null, 2)}\n`, { mode: 0o600 });
}

export function createOAuthClient(channel = 'wemakevoice') {
  const config = getYouTubeConfig({ requireOAuth: true, channel });
  const client = new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
  client.on('tokens', (tokens) => {
    saveToken(config.tokenPath, tokens).catch((error) => console.error(`YouTube token 저장 실패: ${error.message}`));
  });
  return { client, config };
}

export async function getAuthorizedClient(channel = 'wemakevoice') {
  const { client, config } = createOAuthClient(channel);
  const token = await readToken(config.tokenPath);
  if (!token) throw new Error('YouTube OAuth 인증이 필요합니다. 먼저 npm run youtube:auth 를 실행하세요.');
  client.setCredentials(token);
  return client;
}

export async function authorizeInteractively(channel = 'wemakevoice') {
  const { client, config } = createOAuthClient(channel);
  const redirect = new URL(config.redirectUri);
  if (!['127.0.0.1', 'localhost'].includes(redirect.hostname)) {
    throw new Error('POC OAuth redirect URI는 localhost 또는 127.0.0.1이어야 합니다.');
  }

  const state = randomBytes(24).toString('hex');
  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: true,
    scope: SCOPES,
    state,
  });

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const requestUrl = new URL(request.url, config.redirectUri);
      if (requestUrl.pathname !== redirect.pathname) {
        response.writeHead(404).end('Not found');
        return;
      }
      if (requestUrl.searchParams.get('state') !== state) {
        response.writeHead(400).end('Invalid OAuth state');
        server.close();
        reject(new Error('OAuth state가 일치하지 않습니다. 인증을 다시 시도하세요.'));
        return;
      }
      const error = requestUrl.searchParams.get('error');
      const authCode = requestUrl.searchParams.get('code');
      if (error || !authCode) {
        response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }).end(`YouTube 인증 실패: ${error || 'code 없음'}`);
        server.close();
        reject(new Error(`Google 인증이 완료되지 않았습니다: ${error || 'authorization code 없음'}`));
        return;
      }
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end('<h2>YouTube 인증이 완료되었습니다.</h2><p>이 창을 닫고 터미널로 돌아가세요.</p>');
      server.close();
      resolve(authCode);
    });
    server.on('error', reject);
    server.listen(Number(redirect.port || 80), redirect.hostname, () => {
      console.log(`\n[${config.channel}] 채널로 사용할 Google/YouTube 계정을 선택해 승인하세요:\n`);
      console.log(authUrl);
      console.log(`\nOAuth callback 대기 중: ${config.redirectUri}\n`);
    });
    setTimeout(() => {
      server.close();
      reject(new Error('OAuth 인증 대기 시간이 5분을 초과했습니다.'));
    }, 5 * 60 * 1000).unref();
  });

  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error('refresh token을 받지 못했습니다. Google 계정 권한을 취소한 뒤 다시 인증하세요.');
  }
  client.setCredentials(tokens);
  await saveToken(config.tokenPath, tokens);
  console.log(`YouTube OAuth token 저장 완료: ${config.tokenPath}`);
  return client;
}

export async function verifyAuthorizedChannel(auth, expectedChannelId) {
  if (!expectedChannelId) throw new Error('실제 업로드에는 YOUTUBE_CHANNEL_ID가 필요합니다.');
  const youtube = google.youtube({ version: 'v3', auth });
  const response = await youtube.channels.list({ part: ['id', 'snippet'], mine: true });
  const channel = response.data.items?.[0];
  if (!channel?.id) throw new Error('OAuth 계정에서 YouTube 채널을 찾을 수 없습니다.');
  if (channel.id !== expectedChannelId) {
    throw new Error(`OAuth 채널 불일치: 인증=${channel.id}, 설정=${expectedChannelId}`);
  }
  return { id: channel.id, title: channel.snippet?.title || '' };
}
