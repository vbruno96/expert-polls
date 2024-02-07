import { FastifyInstance } from "fastify"
import { randomUUID } from "node:crypto"
import z from "zod";
import { prisma } from "../../lib/prisma"
import { redis } from "../../lib/redis";

export async function voteOnPoll(app: FastifyInstance) {
  app.post('/polls/:pollId/votes', async (request, replay) => {
    const voteOnPollBody = z.object({
      pollOptionId: z.string().uuid(),
    })

    const voteOnPollParams= z.object({
      pollId: z.string().uuid(),
    })
  
    const { pollId } = voteOnPollParams.parse(request.params)
    const { pollOptionId } = voteOnPollBody.parse(request.body)

    let { sessionId } = request.cookies

    if (sessionId) {
      const userPreviousVoteOnPoll = await prisma.vote.findUnique({
        where: {
          sessionId_pollId: {
            sessionId,
            pollId
          }
        }
      })

      if (userPreviousVoteOnPoll && userPreviousVoteOnPoll.pollOptionId !== pollOptionId) {
        await prisma.vote.delete({
          where: {
            id: userPreviousVoteOnPoll.id
          }
        })

        await redis.zincrby(pollId, -1, userPreviousVoteOnPoll.pollOptionId)
      } else if (userPreviousVoteOnPoll) {
        return replay.status(401).send({ message: "You already voted on this poll." })
      }
    }

    if (!sessionId) {
      sessionId = randomUUID()

      const thirtyDaysInSeconds = 60 * 60 * 24 * 30

      replay.setCookie('sessionId', sessionId, {
        path: '/',
        maxAge: thirtyDaysInSeconds,
        signed: true,
        httpOnly: true,
      })
    }
    
    await prisma.vote.create({
      data: {
        sessionId,
        pollId,
        pollOptionId
      }
    })


    await redis.zincrby(pollId, 1, pollOptionId)
    
    return replay.status(201).send()
  })
}