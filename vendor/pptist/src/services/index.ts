import axios from './axios'
import fetchRequest from './fetch'

// export const SERVER_URL = 'http://localhost:5000'
export const SERVER_URL = (import.meta.env.MODE === 'development') ? '/api' : 'https://server.pptist.cn'

interface ImageSearchPayload {
  query: string;
  orientation?: 'landscape' | 'portrait' | 'square' | 'all';
  locale?: 'zh' | 'en';
  order?: 'popular' | 'latest';
  size?: 'large' | 'medium' | 'small';
  image_type?: 'all' | 'photo' | 'illustration' | 'vector';
  page?: number;
  per_page?: number;
}

interface AIPPTOutlinePayload {
  content: string
  language: string
  provider: string
  model: string
}

interface AIPPTPayload {
  content: string
  language: string
  style: string
  provider: string
  model: string
}

interface AIWritingPayload {
  content: string
  command: string
}

export default {
  getMockData(filename: string): Promise<any> {
    // classdesk 接入补丁：Electron 生产包以 file:// 加载，渲染层 XHR 读本地文件会被 CORS 拦截；
    // 优先走宿主（classdesk preload）提供的本地读盘通道，退回 axios（开发态 vite 可直接服务 ./mocks）。
    const desk = (window as { desk?: { readMock?: (name: string) => Promise<any> } }).desk
    if (desk && typeof desk.readMock === 'function') return desk.readMock(filename)
    return axios.get(`./mocks/${filename}.json`)
  },

  searchImage(body: ImageSearchPayload): Promise<any> {
    return axios.post(`${SERVER_URL}/tools/img_search`, body)
  },

  AIPPT_Outline({
    content,
    language,
    provider,
    model,
  }: AIPPTOutlinePayload): Promise<any> {
    return fetchRequest(`${SERVER_URL}/tools/aippt_outline`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        language,
        provider,
        model,
        stream: true,
      }),
    })
  },

  AIPPT({
    content,
    language,
    style,
    provider,
    model,
  }: AIPPTPayload): Promise<any> {
    return fetchRequest(`${SERVER_URL}/tools/aippt`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        language,
        provider,
        model,
        style,
        stream: true,
      }),
    })
  },

  AI_Writing({
    content,
    command,
  }: AIWritingPayload): Promise<any> {
    return fetchRequest(`${SERVER_URL}/tools/ai_writing`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        command,
        stream: true,
      }),
    })
  },
}