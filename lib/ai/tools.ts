import { Permission } from '@/lib/rbac'
import { createTicket } from '@/lib/services/ticketService'

export type ToolExecutionContext = {
  hotelId: string
  userId?: string | null
  permissions: Permission[]
}

export type ToolCallResult = {
  name: string
  result: unknown
}

export const toolDefinitions = [
  {
    type: 'function' as const,
    function: {
      name: 'create_ticket',
      description: 'Creates a support ticket for the guest with provided details.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short summary of the request.' },
          description: { type: 'string', description: 'Detailed description of the issue.' },
          priority: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
            description: 'Priority level for the ticket.',
          },
        },
        required: ['title', 'description'],
      },
    },
  },
] as const

export async function executeToolCall(
  toolName: string,
  rawArgs: string,
  context: ToolExecutionContext
): Promise<ToolCallResult | null> {
  switch (toolName) {
    case 'create_ticket': {
      if (!context.permissions.includes(Permission.TICKETS_CREATE)) {
        return {
          name: toolName,
          result: {
            success: false,
            message: 'Missing tickets:create permission for tool execution.',
          },
        }
      }

      if (!context.userId) {
        return {
          name: toolName,
          result: {
            success: false,
            message: 'Authenticated user is required for ticket creation.',
          },
        }
      }

      let parsedArgs: Record<string, unknown>
      try {
        parsedArgs = rawArgs ? JSON.parse(rawArgs) : {}
      } catch (error) {
        return {
          name: toolName,
          result: {
            success: false,
            message: 'Invalid arguments provided to create_ticket tool.',
            error: (error as Error).message,
          },
        }
      }

      if (typeof parsedArgs !== 'object' || parsedArgs === null) {
        return {
          name: toolName,
          result: {
            success: false,
            message: 'Tool arguments must resolve to an object.',
          },
        }
      }

      const title = typeof parsedArgs.title === 'string' ? parsedArgs.title : null
      if (!title) {
        return {
          name: toolName,
          result: {
            success: false,
            message: 'Ticket title is required to create a ticket.',
          },
        }
      }

      const description = typeof parsedArgs.description === 'string' ? parsedArgs.description : undefined
      const rawPriority = typeof parsedArgs.priority === 'string' ? parsedArgs.priority.toUpperCase() : undefined
      const allowedPriorities = new Set(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
      const priority = rawPriority && allowedPriorities.has(rawPriority) ? rawPriority : undefined

      try {
        const ticket = await createTicket(
          {
            hotelId: context.hotelId,
            userId: context.userId as string,
          },
          {
            title,
            description,
            priority,
            source: 'AI_AGENT',
          }
        )

        return {
          name: toolName,
          result: {
            success: true,
            ticketId: ticket.id,
            status: ticket.status,
            priority: ticket.priority,
          },
        }
      } catch (error) {
        return {
          name: toolName,
          result: {
            success: false,
            message: 'Ticket service rejected create_ticket request.',
            error: (error as Error).message,
          },
        }
      }
    }
    default:
      return null
  }
}
