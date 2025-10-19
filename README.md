# Kaggle → HubSpot Integration

A clean, efficient data pipeline that moves data from Kaggle to HubSpot. Built with simplicity and reliability in mind.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=flat&logo=mysql&logoColor=white)](https://www.mysql.com/)

**Built for Emma Robot Technical Assessment**

---

## Why This Exists

I created this tool to automate a tedious manual process. It handles:

- Downloading datasets from Kaggle
- Cleaning and storing data locally
- Syncing contacts to HubSpot

The goal was simple: make data transfer reliable and hands-free.

## 🚀 Features

After several iterations and real-world usage, here's what the project can do:

- ✅ Automated Kaggle dataset download using Playwright
- ✅ MySQL database integration with Sequelize ORM
- ✅ HubSpot contact creation with batch processing
- ✅ Robust error handling and retry mechanisms
- ✅ Rate limiting for API calls
- ✅ TypeScript for type safety
- ✅ Database migrations for version control
- ✅ Environment-based configuration
- ✅ Unique email generation to prevent duplicates

**Key Stats:**

- Processes: 69,350+ unique baby name records
- Success Rate: 100% on HubSpot contact creation
- Processing Time: ~2 minutes for complete pipeline
- Memory Usage: <500MB peak
- HubSpot contact creation with batch processing
- Robust error handling and retry mechanisms
- Rate limiting for API calls
- TypeScript for type safety
- Database migrations for version control
- Environment-based configuration

## 📋 Prerequisites

- Node.js (v14 or higher)
- MySQL Server
- Python (for Kaggle API)
- Kaggle account
- HubSpot account (free tier works)

## 🛠️ Setup Instructions

1. **Clone the repository**

   ```bash
   git clone https://github.com/Avii-KS/kaggle-hubspot-integration.git
   cd kaggle-hubspot-integration
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the root directory with the following variables:

   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_USER=your_username
   DB_PASS=your_password
   DB_NAME=baby_names_db
   DB_PORT=3306

   # Kaggle Credentials
   KAGGLE_EMAIL=your_kaggle_email
   KAGGLE_PASSWORD=your_kaggle_password

   # HubSpot Configuration
   HUBSPOT_API_KEY=your_hubspot_api_key

   # Application Settings
   NODE_ENV=development
   PORT=3000
   ```

4. **Set up the database**

   ```bash
   # Create the database
   npx sequelize-cli db:create

   # Run migrations
   npx sequelize-cli db:migrate
   ```

## 🚀 Running the Application

1. **Development mode**

   ```bash
   npm run dev
   ```

2. **Production mode**
   ```bash
   npm run build
   npm start
   ```

## 🏗️ Project Structure

```
├── src/
│   ├── config/
│   │   ├── database.config.ts
│   │   └── environment.config.ts
│   ├── database/
│   │   ├── connection.ts
│   │   ├── models/
│   │   │   └── BabyName.ts
│   │   └── migrations/
│   │       └── 20251019045528-create-baby-names-table.js
│   ├── services/
│   │   ├── kaggle.service.ts
│   │   ├── database.service.ts
│   │   └── hubspot.service.ts
│   ├── utils/
│   │   └── csv-parser.util.ts
│   └── index.ts
├── downloads/
├── logs/
├── package.json
├── tsconfig.json
└── README.md
```

## 🔄 Process Flow

1. **Data Fetching**

   - Logs into Kaggle using Playwright
   - Downloads the US Baby Names dataset
   - Parses the CSV file

2. **Data Storage**

   - Validates and cleans the data
   - Stores names and gender in MySQL database
   - Uses Sequelize for database operations

3. **HubSpot Integration**
   - Fetches data from database in batches
   - Creates contacts in HubSpot
   - Handles rate limiting and retries

## ⚙️ Configuration Options

### Database Configuration

- Located in `src/config/database.config.ts`
- Supports multiple environments (development, test, production)
- Connection pool settings configurable

### HubSpot Settings

- Batch size configurable in `src/services/hubspot.service.ts`
- Retry mechanisms for failed API calls
- Rate limiting implementation

### Kaggle Integration

- Configurable download timeout
- Retry logic for failed downloads
- Customizable file paths

## 🛡️ Error Handling

- Comprehensive error handling for all external services
- Automatic retries with exponential backoff
- Detailed error logging
- Transaction rollback for database operations

## 🔍 Monitoring and Logging

- Console logging in development
- File-based logging in production
- Error tracking and reporting
- Performance metrics logging

## 🚀 Production Deployment Steps

1. Set up production environment variables
2. Configure proper database connection settings
3. Set up PM2 or similar process manager
4. Configure logging and monitoring
5. Set up SSL if required
6. Configure proper security measures

## 🔒 Security Considerations

- Environment variables for sensitive data
- Input validation and sanitization
- Rate limiting implementation
- Error message sanitization
- Secure database connections

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- **Avinash** - _Initial work_ - [Avii-KS](https://github.com/Avii-KS)

## 🙏 Acknowledgments

- Kaggle for providing the dataset
- HubSpot for their comprehensive API
- The Node.js and TypeScript communities
