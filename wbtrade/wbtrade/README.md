# WBTrade Marketplace

Welcome to the WBTrade Marketplace project! This project is designed to be a comprehensive e-commerce platform that supports a large inventory of products, ranging from 10,000 to 100,000 items. Below you will find an overview of the project structure, features, and how to get started.

## Project Structure

The project is organized into several key directories:

- **apps**
  - **web**: The frontend application built with Next.js.
    - **public**: Contains static files like `robots.txt`.
    - **src**: The source code for the web application.
      - **app**: Contains the main application files, including pages and components.
      - **components**: Reusable UI components.
      - **lib**: Utility functions and configuration settings.
      - **styles**: Global CSS styles.
      - **types**: TypeScript types used throughout the application.
  - **api**: The backend API for handling product, search, and order operations.
    - **src**: The source code for the API.
      - **routes**: Defines the API routes.
      - **controllers**: Contains the logic for handling requests.
      - **services**: Contains business logic for the API.
      - **db**: Manages database connections and queries.
      - **types**: TypeScript types used throughout the API.
- **packages**
  - **shared-types**: Contains shared TypeScript types used across the project.
  - **ui**: Contains reusable UI components.

## Features

- **Extensive Product Catalog**: Supports a wide range of products with detailed information.
- **User Accounts**: Users can create accounts to manage their orders and preferences.
- **Shopping Cart**: Users can add products to their cart and manage their selections.
- **Search Functionality**: Users can search for products easily.
- **Responsive Design**: The application is designed to work on various devices.

## Getting Started

To get started with the WBTrade Marketplace project, follow these steps:

1. **Clone the Repository**:
   ```
   git clone <repository-url>
   cd wbtrade
   ```

2. **Install Dependencies**:
   For both the web and API applications, navigate to their respective directories and run:
   ```
   npm install
   ```

3. **Run the Applications**:
   - For the web application:
     ```
     cd apps/web
     npm run dev
     ```
   - For the API:
     ```
     cd apps/api
     npm run dev
     ```

4. **Access the Application**:
   Open your browser and navigate to `http://localhost:3000` for the web application and `http://localhost:5000` for the API.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any suggestions or improvements.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.