import { describe, it, expect, beforeEach, vi } from "vitest"

// Mock the Clarity VM environment
const mockClarity = {
  tx: {
    sender: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  },
  contracts: {
    "farm-registration": {
      functions: {
        "register-farm": vi.fn(),
        "update-farm": vi.fn(),
        "deactivate-farm": vi.fn(),
        "get-farm": vi.fn(),
        "set-admin": vi.fn(),
      },
      variables: {
        "farm-id-counter": 0,
        admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      },
      maps: {
        farms: new Map(),
      },
    },
  },
}

// Mock the contract calls
vi.mock("@stacks/transactions", () => ({
  callReadOnlyFunction: vi.fn().mockImplementation((contractAddress, contractName, functionName, args) => {
    if (contractName === "farm-registration") {
      if (functionName === "get-farm") {
        const farmId = args[0].value
        return mockClarity.contracts["farm-registration"].maps.farms.get(farmId) || { type: "none" }
      }
    }
    return { type: "none" }
  }),
  
  makeContractCall: vi.fn().mockImplementation(({ contractName, functionName, functionArgs }) => {
    if (contractName === "farm-registration") {
      if (functionName === "register-farm") {
        const location = functionArgs[0].value
        const cropType = functionArgs[1].value
        const areaSize = functionArgs[2].value
        
        if (areaSize <= 0) {
          return { type: "err", value: 1 }
        }
        
        const farmId = ++mockClarity.contracts["farm-registration"].variables["farm-id-counter"]
        mockClarity.contracts["farm-registration"].maps.farms.set(farmId, {
          type: "some",
          value: {
            owner: mockClarity.tx.sender,
            location,
            "crop-type": cropType,
            "area-size": areaSize,
            "registered-at": 123, // Mock block height
            active: true,
          },
        })
        
        return { type: "ok", value: farmId }
      }
      
      if (functionName === "update-farm") {
        const farmId = functionArgs[0].value
        const location = functionArgs[1].value
        const cropType = functionArgs[2].value
        const areaSize = functionArgs[3].value
        
        const farm = mockClarity.contracts["farm-registration"].maps.farms.get(farmId)
        if (!farm) {
          return { type: "err", value: 2 }
        }
        
        if (farm.value.owner !== mockClarity.tx.sender) {
          return { type: "err", value: 3 }
        }
        
        if (areaSize <= 0) {
          return { type: "err", value: 1 }
        }
        
        mockClarity.contracts["farm-registration"].maps.farms.set(farmId, {
          type: "some",
          value: {
            ...farm.value,
            location,
            "crop-type": cropType,
            "area-size": areaSize,
          },
        })
        
        return { type: "ok", value: true }
      }
      
      if (functionName === "deactivate-farm") {
        const farmId = functionArgs[0].value
        
        const farm = mockClarity.contracts["farm-registration"].maps.farms.get(farmId)
        if (!farm) {
          return { type: "err", value: 2 }
        }
        
        if (
            farm.value.owner !== mockClarity.tx.sender &&
            mockClarity.tx.sender !== mockClarity.contracts["farm-registration"].variables.admin
        ) {
          return { type: "err", value: 3 }
        }
        
        mockClarity.contracts["farm-registration"].maps.farms.set(farmId, {
          type: "some",
          value: {
            ...farm.value,
            active: false,
          },
        })
        
        return { type: "ok", value: true }
      }
    }
    
    return { type: "err", value: "Unknown function" }
  }),
}))

describe("Farm Registration Contract", () => {
  beforeEach(() => {
    // Reset the mock state
    mockClarity.contracts["farm-registration"].variables["farm-id-counter"] = 0
    mockClarity.contracts["farm-registration"].maps.farms = new Map()
    
    // Reset mock function calls
    vi.clearAllMocks()
  })
  
  it("should register a new farm successfully", async () => {
    const result = await mockClarity.contracts["farm-registration"].functions["register-farm"](
        "Farm Location",
        "Corn",
        100,
    )
    
    expect(result).toEqual({ type: "ok", value: 1 })
    expect(mockClarity.contracts["farm-registration"].maps.farms.get(1)).toBeDefined()
    expect(mockClarity.contracts["farm-registration"].maps.farms.get(1).value.location).toBe("Farm Location")
    expect(mockClarity.contracts["farm-registration"].maps.farms.get(1).value["crop-type"]).toBe("Corn")
    expect(mockClarity.contracts["farm-registration"].maps.farms.get(1).value["area-size"]).toBe(100)
    expect(mockClarity.contracts["farm-registration"].maps.farms.get(1).value.active).toBe(true)
  })
  
  it("should fail to register a farm with zero area", async () => {
    const result = await mockClarity.contracts["farm-registration"].functions["register-farm"](
        "Farm Location",
        "Corn",
        0,
    )
    
    expect(result).toEqual({ type: "err", value: 1 })
    expect(mockClarity.contracts["farm-registration"].maps.farms.size).toBe(0)
  })
  
  it("should update a farm successfully", async () => {
    // First register a farm
    await mockClarity.contracts["farm-registration"].functions["register-farm"]("Farm Location", "Corn", 100)
    
    // Then update it
    const result = await mockClarity.contracts["farm-registration"].functions["update-farm"](
        1,
        "New Location",
        "Wheat",
        200,
    )
    
    expect(result).toEqual({ type: "ok", value: true })
    expect(mockClarity.contracts["farm-registration"].maps.farms.get(1).value.location).toBe("New Location")
    expect(mockClarity.contracts["farm-registration"].maps.farms.get(1).value["crop-type"]).toBe("Wheat")
    expect(mockClarity.contracts["farm-registration"].maps.farms.get(1).value["area-size"]).toBe(200)
  })
  
  it("should deactivate a farm successfully", async () => {
    // First register a farm
    await mockClarity.contracts["farm-registration"].functions["register-farm"]("Farm Location", "Corn", 100)
    
    // Then deactivate it
    const result = await mockClarity.contracts["farm-registration"].functions["deactivate-farm"](1)
    
    expect(result).toEqual({ type: "ok", value: true })
    expect(mockClarity.contracts["farm-registration"].maps.farms.get(1).value.active).toBe(false)
  })
})

