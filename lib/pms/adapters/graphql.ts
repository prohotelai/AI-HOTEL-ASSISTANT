import { PMSIntegrationError } from '../errors'

export type GraphQLRequestOptions = {
  variables?: Record<string, unknown>
  timeout?: number
}

export type GraphQLResponse<T = unknown> = {
  data?: T
  errors?: Array<{
    message: string
    locations?: Array<{ line: number; column: number }>
    path?: Array<string | number>
    extensions?: Record<string, unknown>
  }>
}

export class GraphQLAdapter {
  private endpoint: string
  private defaultHeaders: Record<string, string>

  constructor(endpoint: string, defaultHeaders: Record<string, string> = {}) {
    this.endpoint = endpoint
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders,
    }
  }

  async query<T = unknown>(
    query: string,
    options: GraphQLRequestOptions = {}
  ): Promise<T> {
    const controller = new AbortController()
    const timeout = options.timeout ?? 30000
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: this.defaultHeaders,
        body: JSON.stringify({
          query,
          variables: options.variables,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const result: GraphQLResponse<T> = await response.json()

      if (result.errors && result.errors.length > 0) {
        const firstError = result.errors[0]
        throw new PMSIntegrationError(`GraphQL error: ${firstError.message}`, {
          statusCode: response.status,
          code: 'GRAPHQL_ERROR',
        })
      }

      if (!result.data) {
        throw new PMSIntegrationError('GraphQL response missing data', {
          statusCode: response.status,
          code: 'INVALID_RESPONSE',
        })
      }

      return result.data
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof PMSIntegrationError) {
        throw error
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new PMSIntegrationError('GraphQL request timed out', {
          statusCode: 504,
          code: 'TIMEOUT',
          cause: error,
        })
      }

      throw new PMSIntegrationError('GraphQL request failed', {
        statusCode: 502,
        code: 'NETWORK_ERROR',
        cause: error,
      })
    }
  }

  async mutate<T = unknown>(
    mutation: string,
    options: GraphQLRequestOptions = {}
  ): Promise<T> {
    return this.query<T>(mutation, options)
  }
}

// Example: Mews PMS GraphQL adapter
export class MewsGraphQLAdapter extends GraphQLAdapter {
  constructor(accessToken: string) {
    super('https://api.mews.com/graphql', {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'AI-Hotel-Assistant/1.0',
    })
  }

  async getReservations(enterpriseId: string, since?: Date) {
    const query = `
      query GetReservations($enterpriseId: ID!, $since: DateTime) {
        reservations(
          enterpriseId: $enterpriseId
          updatedUtc: { value: $since, operator: GREATER_THAN_OR_EQUAL }
        ) {
          id
          state
          number
          startUtc
          endUtc
          customer {
            firstName
            lastName
            email
            phone
          }
          assignedResource {
            name
          }
          totalCost {
            amount
            currency
          }
          createdUtc
          updatedUtc
        }
      }
    `

    const variables: Record<string, unknown> = { enterpriseId }
    if (since) {
      variables.since = since.toISOString()
    }

    return this.query<{ reservations: unknown[] }>(query, { variables })
  }

  async getRooms(enterpriseId: string) {
    const query = `
      query GetRooms($enterpriseId: ID!) {
        resources(enterpriseId: $enterpriseId) {
          id
          name
          type
          state
          floor
          capacity
          category {
            name
          }
          features
          updatedUtc
        }
      }
    `

    return this.query<{ resources: unknown[] }>(query, {
      variables: { enterpriseId },
    })
  }

  async getCustomers(enterpriseId: string) {
    const query = `
      query GetCustomers($enterpriseId: ID!) {
        customers(enterpriseId: $enterpriseId) {
          id
          firstName
          lastName
          email
          phone
          nationalityCode
          birthDate
          loyaltyLevel
          classifications
          updatedUtc
        }
      }
    `

    return this.query<{ customers: unknown[] }>(query, {
      variables: { enterpriseId },
    })
  }
}

// Example: Protel PMS GraphQL adapter
export class ProtelGraphQLAdapter extends GraphQLAdapter {
  constructor(apiKey: string, propertyId: string) {
    super(`https://api.protel.io/graphql/${propertyId}`, {
      'X-API-Key': apiKey,
      'User-Agent': 'AI-Hotel-Assistant/1.0',
    })
  }

  async getBookings(dateFrom?: string, dateTo?: string) {
    const query = `
      query GetBookings($dateFrom: Date, $dateTo: Date) {
        bookings(arrivalFrom: $dateFrom, arrivalTo: $dateTo) {
          edges {
            node {
              id
              reservationNumber
              status
              arrival
              departure
              guest {
                firstName
                lastName
                email
                phoneNumber
              }
              room {
                number
                type
              }
              totalAmount
              currency
              lastModified
            }
          }
        }
      }
    `

    return this.query<{ bookings: { edges: Array<{ node: unknown }> } }>(query, {
      variables: { dateFrom, dateTo },
    })
  }

  async getRoomStatus() {
    const query = `
      query GetRoomStatus {
        rooms {
          id
          number
          type
          floor
          status
          housekeepingStatus
          maxOccupancy
          rackRate
          amenities
        }
      }
    `

    return this.query<{ rooms: unknown[] }>(query)
  }

  async getGuestProfiles(limit?: number) {
    const query = `
      query GetGuestProfiles($limit: Int) {
        guests(first: $limit) {
          edges {
            node {
              id
              firstName
              lastName
              email
              phone
              address {
                country
              }
              dateOfBirth
              loyaltyProgram {
                tier
                points
              }
              preferences
              stayCount
              totalRevenue
            }
          }
        }
      }
    `

    return this.query<{ guests: { edges: Array<{ node: unknown }> } }>(query, {
      variables: { limit },
    })
  }
}
