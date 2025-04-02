import { describe, it, expect, beforeEach, vi } from "vitest"

// Mock the Clarity VM environment
const mockClarity = {
  tx: {
    sender: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  },
  contracts: {
    "weather-oracle": {
      functions: {
        "submit-weather-data": vi.fn(),
        "report-weather-event": vi.fn(),
        "get-weather-data": vi.fn(),
        "get-weather-event": vi.fn(),
        "set-oracle": vi.fn(),
        "set-admin": vi.fn(),
      },
      variables: {
        "event-id-counter": 0,
        admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
        "oracle-address": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      },
      maps: {
        "weather-data": new Map(),
        "weather-events": new Map(),
      },
    },
  },
}

// Mock the contract calls
vi.mock('@stacks/transactions', () => ({
  callReadOnlyFunction: vi.fn().mockImplementation((contractAddress, contractName, functionName, args) => {
    if (contractName === 'weather-oracle') {
      if (functionName === 'get-weather-data') {
        const location = args[0].value;
        const timestamp = args[1].value;
        const key = `${location}-${timestamp}`;
        return mockClarity.contracts['weather-oracle'].maps['weather-data'].get(key) || { type: 'none' };
      }
      
      if (functionName === 'get-weather-event') {
        const location = args[0].value;
        const eventId = args[1].value;
        const key = `${location}-${eventId}`;
        return mockClarity.contracts['weather-oracle'].maps['weather-events'].get(key) || { type: 'none' };
      }
    }
    return { type: 'none' };
  }),
  
  makeContractCall: vi.fn().mockImplementation(({ contractName, functionName, functionArgs }) => {
    if (contractName === 'weather-oracle') {
      // Check if sender is oracle
      if (mockClarity.tx.sender !== mockClarity.contracts['weather-oracle'].variables['oracle-address']) {
        return { type: 'err', value: 1 };
        return { type: 'err', value: 1 };
        
        if (functionName === 'submit-weather-data') {
          const location = functionArgs[0].value;
          const timestamp = functionArgs[1].value;
          const temperature = functionArgs[2].value;
          const rainfall = functionArgs[3].value;
          const humidity = functionArgs[4].value;
          const windSpeed = functionArgs[5].value;
          
          const key = `${location}-${timestamp}`;
          mockClarity.contracts['weather-oracle'].maps['weather-data'].set(key, {
            type: 'some',
            value: {
              temperature,
              rainfall,
              humidity,
              'wind-speed': windSpeed,
              'reported-by': mockClarity.tx.sender,
              'reported-at': 123 // Mock block height
            }
          });
          
          return { type: 'ok', value: true };
        }
        
        if (functionName === 'report-weather-event') {
          const location = functionArgs[0].value;
          const eventType = functionArgs[1].value;
          const severity = functionArgs[2].value;
          const startTime = functionArgs[3].value;
          const endTime = functionArgs[4].value;
          
          if (severity > 10) {
            return { type: 'err', value: 2 };
          }
          
          if (startTime >= endTime) {
            return { type: 'err', value: 3 };
          }
          
          const eventId = ++mockClarity.contracts['weather-oracle'].variables['event-id-counter'];
          const key = `${location}-${eventId}`;
          
          mockClarity.contracts['weather-oracle'].maps['weather-events'].set(key, {
            type: 'some',
            value: {
              'event-type': eventType,
              severity,
              'start-time': startTime,
              'end-time': endTime,
              confirmed: true
            }
          });
          
          return { type: 'ok', value: eventId };
        }
      }
      
      return { type: 'err', value: 'Unknown function' };\
    })
  }));

describe("Weather Oracle Contract", () => {
  beforeEach(() => {
    // Reset the mock state
    mockClarity.contracts["weather-oracle"].variables["event-id-counter"] = 0
    mockClarity.contracts["weather-oracle"].maps["weather-data"] = new Map()
    mockClarity.contracts["weather-oracle"].maps["weather-events"] = new Map()
    
    // Reset mock function calls
    vi.clearAllMocks()
  })
  
  it("should submit weather data successfully", async () => {
    const result = await mockClarity.contracts["weather-oracle"].functions["submit-weather-data"](
        "Farm Location",
        1625097600,
        25,
        10,
        65,
        15,
    )
    
    expect(result).toEqual({ type: "ok", value: true })
    
    const key = "Farm Location-1625097600"
    expect(mockClarity.contracts["weather-oracle"].maps["weather-data"].get(key)).toBeDefined()
    expect(mockClarity.contracts["weather-oracle"].maps["weather-data"].get(key).value.temperature).toBe(25)
    expect(mockClarity.contracts["weather-oracle"].maps["weather-data"].get(key).value.rainfall).toBe(10)
    expect(mockClarity.contracts["weather-oracle"].maps["weather-data"].get(key).value.humidity).toBe(65)
    expect(mockClarity.contracts["weather-oracle"].maps["weather-data"].get(key).value["wind-speed"]).toBe(15)
  })
  
  it("should report weather event successfully", async () => {
    const result = await mockClarity.contracts["weather-oracle"].functions["report-weather-event"](
        "Farm Location",
        "Drought",
        8,
        1625097600,
        1625184000,
    )
    
    expect(result).toEqual({ type: "ok", value: 1 })
    
    const key = "Farm Location-1"
    expect(mockClarity.contracts["weather-oracle"].maps["weather-events"].get(key)).toBeDefined()
    expect(mockClarity.contracts["weather-oracle"].maps["weather-events"].get(key).value["event-type"]).toBe("Drought")
    expect(mockClarity.contracts["weather-oracle"].maps["weather-events"].get(key).value.severity).toBe(8)
    expect(mockClarity.contracts["weather-oracle"].maps["weather-events"].get(key).value["start-time"]).toBe(1625097600)
    expect(mockClarity.contracts["weather-oracle"].maps["weather-events"].get(key).value["end-time"]).toBe(1625184000)
    expect(mockClarity.contracts["weather-oracle"].maps["weather-events"].get(key).value.confirmed).toBe(true)
  })
  
  it("should fail to report weather event with invalid severity", async () => {
    const result = await mockClarity.contracts["weather-oracle"].functions["report-weather-event"](
        "Farm Location",
        "Drought",
        11,
        1625097600,
        1625184000,
    )
    
    expect(result).toEqual({ type: "err", value: 2 })
    expect(mockClarity.contracts["weather-oracle"].maps["weather-events"].size).toBe(0)
  })
  
  it("should fail to report weather event with invalid time range", async () => {
    const result = await mockClarity.contracts["weather-oracle"].functions["report-weather-event"](
        "Farm Location",
        "Drought",
        8,
        1625184000,
        1625097600,
    )
    
    expect(result).toEqual({ type: "err", value: 3 })
    expect(mockClarity.contracts["weather-oracle"].maps["weather-events"].size).toBe(0)
  })
})

