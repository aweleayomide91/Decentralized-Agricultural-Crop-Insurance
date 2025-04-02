# Decentralized Agricultural Crop Insurance

A blockchain-based system for providing transparent, efficient, and trustless crop insurance for farmers worldwide.

## Overview

This decentralized application (dApp) leverages blockchain technology to create a peer-to-peer agricultural insurance platform that eliminates intermediaries, reduces costs, and accelerates claim processing. By utilizing smart contracts and oracle systems, the platform provides automated, data-driven coverage for crop losses due to adverse weather conditions and other agricultural risks.

## System Architecture

The system consists of four primary smart contracts working in tandem:

1. **Farm Registration Contract**
    - Records and verifies insured agricultural operations
    - Manages farmer identity and farm metadata
    - Links farms to their respective insurance policies

2. **Weather Data Oracle Contract**
    - Integrates with reliable external weather data sources
    - Provides verified climate information to the system
    - Triggers conditional payments based on predefined weather thresholds

3. **Yield Verification Contract**
    - Validates actual harvest quantities
    - Compares expected vs. actual yields
    - Interfaces with on-field IoT devices and satellite imagery (optional)

4. **Claim Processing Contract**
    - Processes insurance claims automatically based on data from other contracts
    - Calculates payout amounts using predefined formulas
    - Manages the distribution of funds to affected farmers

## Key Features

- **Transparency**: All policy terms, conditions, and payouts are publicly verifiable on the blockchain
- **Efficiency**: Automated claim processing reduces administrative overhead and waiting periods
- **Trustless Operation**: No need to rely on traditional insurance intermediaries
- **Parametric Insurance**: Payouts triggered by verified data rather than subjective assessments
- **Reduced Costs**: Lower premiums due to elimination of intermediaries and reduced operational costs
- **Global Accessibility**: Available to farmers regardless of location or financial infrastructure

## Getting Started

### Prerequisites

- Ethereum wallet (MetaMask recommended)
- ETH for gas fees
- Internet connection for oracle data verification

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-organization/decentralized-crop-insurance.git
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure your environment variables:
   ```
   cp .env.example .env
   ```
   Edit the `.env` file with your specific configuration settings.

4. Deploy the contracts:
   ```
   npx hardhat run scripts/deploy.js --network [your-network]
   ```

### Farmer Registration Process

1. Connect your wallet to the dApp
2. Complete the farm registration form with required details:
    - Farm location (GPS coordinates)
    - Crop types and acreage
    - Expected yield
    - Coverage period
3. Pay the premium in cryptocurrency
4. Receive your policy NFT representing your insurance coverage

## Technical Documentation

### Smart Contract Interactions

```
┌───────────────────┐      ┌───────────────────┐
│                   │      │                   │
│  Farm Registration│◄─────┤ Weather Data      │
│  Contract         │      │ Oracle Contract   │
│                   │      │                   │
└─────────┬─────────┘      └────────┬──────────┘
          │                         │
          ▼                         ▼
┌───────────────────┐      ┌───────────────────┐
│                   │      │                   │
│  Yield            │◄─────┤ Claim Processing  │
│  Verification     │      │ Contract          │
│  Contract         │      │                   │
└───────────────────┘      └───────────────────┘
```

### Data Flow

1. Farmer registers their farm and crops
2. Weather data is continuously monitored by oracles
3. At harvest time, yield verification is conducted
4. If adverse conditions or yield loss is detected, claim processing is triggered automatically
5. Funds are transferred to the farmer's wallet upon successful claim verification

## Development Guide

### Local Development Environment

1. Start a local blockchain:
   ```
   npx hardhat node
   ```

2. Deploy contracts to local network:
   ```
   npx hardhat run scripts/deploy.js --network localhost
   ```

3. Run tests:
   ```
   npx hardhat test
   ```

### Contract Customization

- Weather parameter thresholds can be adjusted in `contracts/WeatherDataOracle.sol`
- Yield calculation formulas can be modified in `contracts/YieldVerification.sol`
- Claim payout calculations can be configured in `contracts/ClaimProcessing.sol`

## Deployment

### Testnet Deployment

1. Ensure your wallet has sufficient test ETH
2. Configure the network in `hardhat.config.js`
3. Run the deployment script:
   ```
   npx hardhat run scripts/deploy.js --network goerli
   ```

### Mainnet Deployment

1. Update contract addresses in configuration files
2. Set appropriate gas limits and prices
3. Deploy with:
   ```
   npx hardhat run scripts/deploy.js --network mainnet
   ```

## Security Considerations

- All contracts have been audited by [Audit Company Name]
- Time-locked admin controls for emergency situations
- Circuit breakers implemented to prevent catastrophic failures
- Regular security assessments and updates

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Weather data provided by [Weather Data Provider]
- Satellite imagery courtesy of [Satellite Data Provider]
- Special thanks to the agricultural extension services for expertise and guidance
