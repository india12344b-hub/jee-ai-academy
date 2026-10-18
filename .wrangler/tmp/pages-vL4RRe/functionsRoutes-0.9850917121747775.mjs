import { onRequestPost as __api_chat_js_onRequestPost } from "D:\\2. Jee Preparation\\jee-ai-academy\\functions\\api\\chat.js"

export const routes = [
    {
      routePath: "/api/chat",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_chat_js_onRequestPost],
    },
  ]