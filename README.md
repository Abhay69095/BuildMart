# BuildMart - Construction Materials eCommerce Platform

A full-stack eCommerce platform for construction materials, tools, and equipment.

## Features

- User authentication and authorization
- Product catalog with categories
- Shopping cart functionality
- Admin dashboard
- Real-time updates using WebSocket
- Secure payment processing
- Contact form
- Newsletter subscription
- Responsive design

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express.js
- Database: MongoDB
- Real-time: WebSocket
- Security: JWT, bcrypt, helmet
- Logging: Winston, Morgan

## Prerequisites

- Node.js >= 14.0.0
- MongoDB
- npm or yarn

## Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
NODE_ENV=production
LOG_LEVEL=info
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/buildmart.git
cd buildmart
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

## Deployment

1. Set up environment variables on your hosting platform
2. Ensure MongoDB connection string is correct
3. Set NODE_ENV to 'production'
4. Deploy using the provided Procfile

### Deployment Checklist

- [ ] Environment variables configured
- [ ] MongoDB database setup
- [ ] SSL/TLS certificate installed
- [ ] Security headers enabled
- [ ] Logging configured
- [ ] Error handling implemented
- [ ] Database indexes created
- [ ] Rate limiting enabled
- [ ] Compression enabled
- [ ] Static files served efficiently

## Security Features

- Helmet.js for security headers
- Rate limiting for API endpoints
- JWT authentication
- Password hashing with bcrypt
- CORS configuration
- XSS protection
- CSRF protection

## Monitoring

- Winston logging
- Morgan HTTP request logging
- Real-time error tracking
- Performance monitoring

## Contributing

Please read CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE.md file for details