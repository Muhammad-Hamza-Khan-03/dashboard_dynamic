// import {z} from 'zod'
// import { Hono } from 'hono'
// import { handle } from 'hono/vercel'
// import { zValidator } from '@hono/zod-validator'
// export const runtime = 'edge'
// import { getAuth,clerkMiddleware } from '@hono/clerk-auth'

// const app = new Hono().basePath('/api');

// app
//     .get(
//     "/hello",
//     clerkMiddleware(),
//      (c) => {
//          const auth = getAuth(c);
//          if (!auth?.userId)
//          {
//              return c.json({error:"Unauthorized"})
//     }
//          return c.json({
//              message: "Hello world",
//              userId:auth.userId,
//         })
// })

// export const GET = handle(app)
// export const POST = handle(app)