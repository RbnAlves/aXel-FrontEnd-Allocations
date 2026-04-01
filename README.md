# Invoice Approvals Platform - Frontend

## Introduction
The Invoice Approvals Platform is a web application for expense management and invoice approvals for mote.consulting. It provides an intuitive interface for managing, submitting, and approving business expenses and invoices.

## Features
- User authentication via Azure AD
- Expense submission and management
- Per diem calculations
- Invoice approval workflows
- Responsive design with TailwindCSS

## Technology Stack
- React 18
- TypeScript
- Vite
- TailwindCSS
- Azure MSAL for authentication

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation
1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Configure the application:
   - Update the API URL in `src/config.ts` if needed (default: http://localhost:8000)

### Development
Start the development server:
```
npm run dev
```
The application will be available at http://localhost:5174

## Build and Deployment

### Building for Production
Build the application for production:
```
npm run build
```
This will create a `dist` directory with the compiled assets.

### Deployment
The application is configured for deployment to IIS with the included `web.config` file, which handles URL rewriting for the SPA routing.

To deploy:
1. Build the application
2. Copy the contents of the `dist` directory to your web server
3. Ensure the server has the appropriate MIME types configured (included in web.config)

## Project Structure
- `src/components/` - React components
- `src/services/` - Service modules for API communication
- `src/types/` - TypeScript type definitions
- `src/config.ts` - Application configuration
- `src/App.tsx` - Main application component
- `src/main.tsx` - Application entry point

## Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License
Proprietary - All rights reserved
