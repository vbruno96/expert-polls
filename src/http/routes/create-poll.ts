import { FastifyInstance } from "fastify"
import z from "zod";
import { prisma } from "../../lib/prisma"

export async function createPoll(app: FastifyInstance) {
  app.post('/polls', async (request, replay) => {
    const createPollBody = z.object({
      title: z.string()
    })
  
    const { title } = createPollBody.parse(request.body)
    
    const newPoll = await prisma.poll.create({
      data: {
        title
      }
    })
    
    return replay.status(201).send({
      pollId: newPoll.id
    })
  })
}