// Auto-generated environment variable types
// Generated on: 2025-06-23T11:25:06.772Z

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Database
      DATABASE_URL: string
      
      // LLM Configuration
      LLAMA_API_URL: string
      LLAMA_MODEL: string
      
      // Application
      NEXT_PUBLIC_APP_NAME: string
      NEXT_PUBLIC_APP_VERSION: string
      
      // Security
      ENCRYPTION_KEY: string
      JWT_SECRET: string
      
      // Optional
      NODE_ENV?: 'development' | 'production' | 'test'
      PORT?: string
    }
  }
}

export {}