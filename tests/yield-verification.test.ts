import { describe, it, expect, beforeEach, vi } from "vitest"

// Mock the Clarity VM environment
const mockClarity = {
  tx: {
    sender: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  },
  contracts: {
    "farm-registration": {
      functions: {
        "get-farm": vi.fn(),
      },
      maps: {
        farms: new Map(),
      },
    },
    "yield-verification": {
      functions: {
        "register-expected-yield": vi.fn(),
        "verify-actual-yield": vi.fn(),
        "get-yield-data": vi.fn(),
        "calculate-yield-loss": vi.fn(),
        "set-verifier": vi.fn(),
        "set-admin": vi.fn(),
      },
      variables: {
        admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
        "verifier-address": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      },
      maps: {
        "yield-data": new Map(),
      },
    },
  },
}

// Setup farm data for testing
mockClarity.contracts["farm-registration"].maps.farms.set(1, {
  type: "some",
  value: {
    owner: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
    location: "Farm Location",
    "crop-type": "Corn",
    "area-size": 100,
    "registered-at": 123,
    active: true,
  },
})

// Mock the contract calls
vi.mock("@stacks/transactions", () => ({
  callReadOnlyFunction: vi.fn().mockImplementation((contractAddress, contractName, functionName, args) => {
    if (contractName === "farm-registration") {
      if (functionName === "get-farm") {
        const farmId = args[0].value
        return mockClarity.contracts["farm-registration"].maps.farms.get(farmId) || { type: "none" }
      }
    }
    
    if (contractName === "yield-verification") {
      if (functionName === "get-yield-data") {
        const farmId = args[0].value
        const season = args[1].value
        const key = `${farmId}-${season}`
        return mockClarity.contracts["yield-verification"].maps["yield-data"].get(key) || { type: "none" }
      }
      
      if (functionName === "calculate-yield-loss") {
        const farmId = args[0].value
        const season = args[1].value
        const key = `${farmId}-${season}`
        const yieldData = mockClarity.contracts["yield-verification"].maps["yield-data"].get(key)
        
        if (!yieldData) {
          return { type: "err", value: 3 }
        }
        
        if (!yieldData.value.verified) {
          return { type: "err", value: 5 }
        }
        
        if (yieldData.value["expected-yield"] <= 0) {
          return { type: "err", value: 6 }
        }
        
        if (yieldData.value["actual-yield"] >= yieldData.value["expected-yield"]) {
          return { type: "ok", value: 0 }
        }
        
        const loss = Math.floor(
            ((yieldData.value["expected-yield"] - yieldData.value["actual-yield"]) * 100) /
            yieldData.value["expected-yield"],
        )
        
        return { type: "ok", value: loss }
      }
    }
    
    return { type: "none" }
  }),
  
  makeContractCall: vi.fn().mockImplementation(({ contractName, functionName, functionArgs }) => {
    if (contractName === "yield-verification") {
      if (functionName === "register-expected-yield") {
        const farmId = functionArgs[0].value
        const season = functionArgs[1].value
        const expectedYield = functionArgs[2].value
        
        // Check if farm exists
        const farm = mockClarity.contracts["farm-registration"].maps.farms.get(farmId)
        if (!farm) {
          return { type: "err", value: 1 }
        }
        
        // Check if caller is farm owner
        if (farm.value.owner !== mockClarity.tx.sender) {
          return { type: "err", value: 2 }
        }
        
        const key = `${farmId}-${season}`
        mockClarity.contracts["yield-verification"].maps["yield-data"].set(key, {
          type: "some",
          value: {
            "expected-yield": expectedYield,
            "actual-yield": 0,
            verified: false,
            "verification-date": 0,
            "verified-by": mockClarity.tx.sender,
          },
        })
        
        return { type: "ok", value: true }
      }
      
      if (functionName === "verify-actual-yield") {
        const farmId = functionArgs[0].value
        const season = functionArgs[1].value
        const actualYield = functionArgs[2].value
        
        // Check if yield data exists
        const key = `${farmId}-${season}`
        const yieldData = mockClarity.contracts["yield-verification"].maps["yield-data"].get(key)
        if (!yieldData) {
          return { type: "err", value: 3 }
        }
        
        // Check if caller is verifier
        if (mockClarity.tx.sender !== mockClarity.contracts["yield-verification"].variables["verifier-address"]) {
          return { type: "err", value: 4 }
        }
        
        mockClarity.contracts["yield-verification"].maps["yield-data"].set(key, {
          type: "some",
          value: {
            "expected-yield": yieldData.value["expected-yield"],
            "actual-yield": actualYield,
            verified: true,
            "verification-date": 123, // Mock block height
            "verified-by": mockClarity.tx.sender,
          },
        })
        
        return { type: "ok", value: true }
      }
    }
    
    return { type: "err", value: "Unknown function" }
  }),
}))

describe("Yield Verification Contract", () => {
  beforeEach(() => {
    // Reset the mock state
    mockClarity.contracts["yield-verification"].maps["yield-data"] = new Map()
    
    // Reset mock function calls
    vi.clearAllMocks()
  })
  
  it("should register expected yield successfully", async () => {
    const result = await mockClarity.contracts["yield-verification"].functions["register-expected-yield"](
        1,
        "Summer 2023",
        5000,
    )
    
    expect(result).toEqual({ type: "ok", value: true })
    
    const key = "1-Summer 2023"
    expect(mockClarity.contracts["yield-verification"].maps["yield-data"].get(key)).toBeDefined()
    expect(mockClarity.contracts["yield-verification"].maps["yield-data"].get(key).value["expected-yield"]).toBe(5000)
    expect(mockClarity.contracts["yield-verification"].maps["yield-data"].get(key).value["actual-yield"]).toBe(0)
    expect(mockClarity.contracts["yield-verification"].maps["yield-data"].get(key).value.verified).toBe(false)
  })
  
  it("should verify actual yield successfully", async () => {
    // First register expected yield
    await mockClarity.contracts["yield-verification"].functions["register-expected-yield"](1, "Summer 2023", 5000)
    
    // Then verify actual yield
    const result = await mockClarity.contracts["yield-verification"].functions["verify-actual-yield"](
        1,
        "Summer 2023",
        4000,
    )
    
    expect(result).toEqual({ type: "ok", value: true })
    
    const key = "1-Summer 2023"
    expect(mockClarity.contracts["yield-verification"].maps["yield-data"].get(key).value["actual-yield"]).toBe(4000)
    expect(mockClarity.contracts["yield-verification"].maps["yield-data"].get(key).value.verified).toBe(true)
  })
  
  it("should calculate yield loss correctly", async () => {
    // First register expected yield
    await mockClarity.contracts["yield-verification"].functions["register-expected-yield"](1, "Summer 2023", 5000)
    
    // Then verify actual yield
    await mockClarity.contracts["yield-verification"].functions["verify-actual-yield"](1, "Summer 2023", 4000)
    
    // Calculate yield loss
    const result = await mockClarity.contracts["yield-verification"].functions["calculate-yield-loss"](1, "Summer 2023")
    
    // Expected loss: (5000 - 4000) * 100 / 5000 = 20%
    expect(result).toEqual({ type: "ok", value: 20 })
  })
  
  it("should fail to calculate yield loss for unverified data", async () => {
    // Register expected yield but don't verify
    await mockClarity.contracts["yield-verification"].functions["register-expected-yield"](1, "Summer 2023", 5000)
    
    // Try to calculate yield loss
    const result = await mockClarity.contracts["yield-verification"].functions["calculate-yield-loss"](1, "Summer 2023")
    
    expect(result).toEqual({ type: "err", value: 5 })
  })
})

