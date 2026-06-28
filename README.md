# 🎥 YouTube Clone API

A fully-featured backend API for a YouTube-like video streaming platform built with Node.js, Express, and MongoDB. This project provides complete functionality for user management, video uploads, streaming, commenting, and social features like subscriptions and likes.



---

## ✨ Features

### User Management
- User registration and authentication with JWT
- Secure password hashing with bcryptjs
- User profiles with custom avatars and banners
- Channel management and profiles
- Watch history tracking

### Video Management
- Video upload with automatic file organization
- Video metadata management (title, description, category)
- Thumbnail upload and management
- Video visibility control (public/private)
- Advanced HTTP 206 Partial Content streaming
- View count tracking

### Social Features
- Subscription/unsubscribe to channels
- Like and dislike videos
- Comment system with nested ownership
- Comment liking functionality
- Subscribed videos feed

### Security & Performance
- JWT-based authentication
- Rate limiting on auth and upload endpoints
- MongoDB injection prevention with sanitization
- CORS support with configurable origins
- Helmet.js for HTTP security headers
- Secure cookie handling

### Developer Experience
- Global error handling middleware
- Async error handling wrapper
- Standardized API response format
- Detailed error messages
- Comprehensive logging

---

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (jsonwebtoken)
- **File Upload:** Multer
- **Security:** Helmet, bcryptjs, express-rate-limit, express-mongo-sanitize
- **Validation:** Built-in with Mongoose schemas
- **Environment:** dotenv

---

## 📋 Prerequisites

Before you begin, ensure you have installed:
- Node.js (v14 or higher)
- npm or yarn
- MongoDB (v4.4 or higher) - local or MongoDB Atlas cloud
- Postman or similar API testing tool (optional)

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/qaxixam/youtube-clone-api.git
cd youtube-clone-api
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Environment File

Create a `.env` file in the root directory:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/youtube-clone
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/youtube-clone

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

# CORS Configuration
FRONTEND_URL=http://localhost:5173

# File Upload
MAX_FILE_SIZE=104857600 # 100MB in bytes
```

### 4. Create Required Directories

```bash
mkdir -p public/uploads/videos
mkdir -p public/uploads/images
```

### 5. Start the Server

**Development Mode (with nodemon):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

The API will be available at `http://localhost:5000`

---

## 📁 Project Structure

```
youtube-clone-api/
├── config/
│   └── db.js                      # MongoDB connection
├── controllers/
│   ├── user.controller.js         # User business logic
│   ├── video.controller.js        # Video management logic
│   └── comment.controller.js      # Comment operations
├── models/
│   ├── user.model.js              # User schema
│   ├── video.model.js             # Video schema
│   └── comment.model.js           # Comment schema
├── routes/
│   ├── user.routes.js             # User endpoints
│   ├── video.routes.js            # Video endpoints
│   └── comment.routes.js          # Comment endpoints
├── middlewares/
│   ├── auth.middleware.js         # JWT verification
│   ├── error.middleware.js        # Global error handler
│   ├── multer.middleware.js       # File upload configuration
│   └── rateLimiter.middleware.js  # Rate limiting rules
├── utils/
│   ├── ApiError.js                # Custom error class
│   ├── ApiResponse.js             # Standardized response format
│   └── asyncHandler.js            # Async error wrapper
├── public/
│   └── uploads/                   # User-uploaded files
│       ├── videos/
│       ├── images/
│       └── default-*.svg          # Default avatars/banners
├── index.js                       # Application entry point
├── .env.example                   # Environment variables template
├── package.json
└── README.md
```

---

## 🔌 API Documentation

### Base URL
```
http://localhost:5000/api/v1
```

### Response Format

All endpoints return a standardized response:

```json
{
  "statusCode": 200,
  "data": {},
  "message": "Success message",
  "success": true
}
```

---

## 👤 User Endpoints

### Register User
```http
POST /users/register
Content-Type: multipart/form-data

Fields:
- username (string, required, unique)
- email (string, required, unique)
- password (string, required, min 6 chars)
- channelName (string, required)
- avatar (file, optional)
- banner (file, optional)
```

**Response:**
```json
{
  "statusCode": 201,
  "data": {
    "user": {
      "_id": "user_id",
      "username": "johndoe",
      "email": "john@example.com",
      "channelName": "John's Channel",
      "avatar": "/uploads/images/avatar-xxx.jpg",
      "banner": "/uploads/images/banner-xxx.jpg",
      "subscribersCount": 0,
      "createdAt": "2024-01-15T10:30:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  },
  "message": "User registered successfully",
  "success": true
}
```

### Login User
```http
POST /users/login
Content-Type: application/json

{
  "email": "john@example.com",
  "username": "johndoe",
  "password": "securePassword123"
}
```

### Get Current User
```http
GET /users/me
Authorization: Bearer <token>
```

### Get Channel Profile
```http
GET /users/c/:username
Authorization: Bearer <token> (optional)
```

### Logout User
```http
POST /users/logout
Authorization: Bearer <token>
```

### Toggle Subscribe to Channel
```http
POST /users/subscribe/:channelId
Authorization: Bearer <token>
```

### Get Subscribed Channels
```http
GET /users/subscriptions
Authorization: Bearer <token>
```

### Get Watch History
```http
GET /users/history
Authorization: Bearer <token>
```

---

## 🎬 Video Endpoints

### Upload Video
```http
POST /videos/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Fields:
- title (string, required)
- description (string, optional)
- category (string, required)
- visibility (string, optional: 'public'/'private', default: 'public')
- videoFile (file, required) - .mp4, .mkv, .webm, .avi, .mov
- thumbnailUrl (file, required) - .jpg, .jpeg, .png, .webp
```

**Rate Limited:** 10 uploads per hour per IP

### Get All Videos
```http
GET /videos?page=1&limit=12&query=tutorial&category=Gaming&sortBy=createdAt&sortType=desc&userId=user_id
Authorization: Bearer <token> (optional)

Query Parameters:
- page (number, default: 1)
- limit (number, default: 12)
- query (string) - search in title/description
- category (string) - filter by category
- sortBy (string, default: 'createdAt') - 'createdAt', 'views'
- sortType (string, default: 'desc') - 'asc' or 'desc'
- userId (string) - filter by channel owner
```

### Get Video by ID
```http
GET /videos/v/:videoId
Authorization: Bearer <token> (optional)
```

**Response includes:**
- Video metadata
- Owner information
- Like/dislike counts
- Whether current user liked/disliked
- Subscription status
- Automatically adds to watch history if authenticated

### Update Video Details
```http
PATCH /videos/v/:videoId
Authorization: Bearer <token>
Content-Type: multipart/form-data

Fields:
- title (string, optional)
- description (string, optional)
- category (string, optional)
- visibility (string, optional)
- thumbnailUrl (file, optional)
```

### Delete Video
```http
DELETE /videos/v/:videoId
Authorization: Bearer <token>
```

Deletes video file and thumbnail from disk.

### Toggle Like Video
```http
POST /videos/v/:videoId/like
Authorization: Bearer <token>
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "isLiked": true,
    "isDisliked": false,
    "likesCount": 15,
    "dislikesCount": 2
  },
  "message": "Like toggled successfully",
  "success": true
}
```

### Toggle Dislike Video
```http
POST /videos/v/:videoId/dislike
Authorization: Bearer <token>
```

### Increment View Count
```http
POST /videos/v/:videoId/view
```

### Stream Video (HTTP 206 Partial Content)
```http
GET /videos/v/:videoId/stream
Range: bytes=0-1048576 (optional for seeking)
```

Supports byte-range requests for seeking in video players.

### Get Subscribed Videos Feed
```http
GET /videos/subscriptions-feed?page=1&limit=12
Authorization: Bearer <token>

Returns videos from all subscribed channels, paginated and sorted by newest first.
```

---

## 💬 Comment Endpoints

### Get Video Comments
```http
GET /comments/v/:videoId?page=1&limit=10
Authorization: Bearer <token> (optional)

Returns paginated comments with owner information and like counts.
```

### Add Comment
```http
POST /comments/v/:videoId
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Great video! Thanks for the tutorial."
}
```

### Delete Comment
```http
DELETE /comments/c/:commentId
Authorization: Bearer <token>

Only the comment owner can delete their comment.
```

### Toggle Like Comment
```http
POST /comments/c/:commentId/like
Authorization: Bearer <token>
```

---

## 🗄️ Database Schema

### User Schema
```javascript
{
  username: String (unique, indexed),
  email: String (unique),
  password: String (hashed),
  channelName: String,
  avatar: String (path),
  banner: String (path),
  subscribers: [ObjectId], // Users who subscribed to this channel
  subscribedTo: [ObjectId], // Channels this user subscribed to
  watchHistory: [ObjectId], // Videos watched
  subscribersCount: Virtual (subscribers.length),
  timestamps: true
}
```

### Video Schema
```javascript
{
  title: String (indexed),
  description: String,
  videoUrl: String,
  thumbnailUrl: String,
  views: Number (default: 0),
  duration: Number (seconds),
  owner: ObjectId (indexed, ref: User),
  likes: [ObjectId],
  dislikes: [ObjectId],
  category: String (indexed),
  visibility: String (enum: ['public', 'private']),
  likesCount: Virtual,
  dislikesCount: Virtual,
  timestamps: true
}
```

### Comment Schema
```javascript
{
  video: ObjectId (indexed, ref: Video),
  owner: ObjectId (ref: User),
  content: String (trimmed),
  likes: [ObjectId],
  likesCount: Virtual,
  timestamps: true
}
```

---

## 🔐 Security Features

### Authentication
- **JWT-based:** Stateless authentication with JSON Web Tokens
- **Secure Cookies:** HTTP-only, Secure (HTTPS in production), SameSite flags
- **Password Hashing:** bcryptjs with salt rounds
- **Token Validation:** Verified on protected routes

### Rate Limiting
- **Auth Endpoints:** 15 requests per 15 minutes
- **Upload Endpoints:** 10 uploads per hour
- **General API:** 200 requests per 15 minutes

### Data Sanitization
- **Mongo Injection Prevention:** express-mongo-sanitize
- **Input Validation:** Mongoose schema validation
- **Trim & Lowercase:** Applied to username, email fields

### HTTP Security
- **Helmet.js:** Security headers (CSP, XSS protection, etc.)
- **CORS:** Configurable cross-origin requests
- **File Upload:** Extension and MIME type validation

### Authorization
- Users can only modify their own content
- Comment deletion restricted to comment owner
- Video operations restricted to video owner

---

## ⚠️ Error Handling

All errors follow a standardized format:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "success": false,
  "errors": [],
  "stack": "..." // Only in development
}
```

### Common HTTP Status Codes
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate username/email)
- `416` - Range Not Satisfiable (invalid video stream range)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

---

## 🚦 Middleware Stack

### Execution Order
1. **Security Middlewares**
   - CORS
   - Helmet
   - Mongo Sanitization

2. **Parsing & Utilities**
   - Express JSON parser
   - URL-encoded parser
   - Cookie parser
   - Static file server

3. **Rate Limiting**
   - General rate limiter on `/api` routes

4. **Route-Specific Middlewares**
   - Authentication (verifyJWT / verifyJWTOptional)
   - File Upload (multer)
   - Rate limiters (auth, upload)

5. **Error Handling**
   - Global error handler (must be last)

---

## 📝 Environment Variables Reference

```env
# Application
NODE_ENV=development|production
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/youtube-clone

# JWT
JWT_SECRET=your-secret-key-min-32-chars-recommended
JWT_EXPIRES_IN=7d

# CORS
FRONTEND_URL=http://localhost:5173

# File Upload (optional, defaults in multer.js)
MAX_FILE_SIZE=104857600
```

---

## 🧪 Testing the API

### Using Postman
1. Import the provided Postman collection (if available)
2. Set the base URL to `http://localhost:5000/api/v1`
3. Register a test user
4. Copy the returned token
5. Add to `Authorization` tab: `Bearer <token>`

### Using cURL
```bash
# Register
curl -X POST http://localhost:5000/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "channelName": "Test Channel"
  }'

# Login
curl -X POST http://localhost:5000/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Get current user (with token)
curl -X GET http://localhost:5000/api/v1/users/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards
- Follow existing code style
- Add comments for complex logic
- Test your changes locally
- Update documentation if needed

---

## 📖 API Documentation Files

- [User API Reference](./docs/USER_API.md) - Detailed user endpoints
- [Video API Reference](./docs/VIDEO_API.md) - Video management endpoints
- [Comment API Reference](./docs/COMMENT_API.md) - Comment system endpoints
- [Authentication Guide](./docs/AUTHENTICATION.md) - JWT and security details
- [Database Schema](./docs/DATABASE.md) - Detailed schema documentation

---

## 🐛 Known Issues & Limitations

- Video duration is currently mocked (returns random value 60-600 seconds)
- File storage is local disk (consider S3/cloud storage for production)
- No video transcoding (stores original quality only)
- Comments don't support threading/replies yet
- No admin or moderation features

---

## 🚀 Future Enhancements

- [ ] Video transcoding and multiple quality options
- [ ] Cloud storage integration (AWS S3/Google Cloud)
- [ ] Comment threading and nested replies
- [ ] Video recommendations engine
- [ ] Advanced search with filters
- [ ] Playlist functionality
- [ ] Video publishing schedule
- [ ] Analytics and statistics dashboard
- [ ] Admin panel for moderation
- [ ] Notification system
- [ ] Real-time updates with WebSockets
- [ ] Video processing queue (Bull/RabbitMQ)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 👨‍💻 Author

**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your.email@example.com
- LinkedIn: [Your Profile](https://linkedin.com/in/yourprofile)

---

## 📞 Support

Have questions or found a bug? Please open an issue on GitHub or contact the maintainers.

### Quick Links
- [Issues](https://github.com/yourusername/youtube-clone-api/issues)
- [Discussions](https://github.com/yourusername/youtube-clone-api/discussions)
- [Wiki](https://github.com/yourusername/youtube-clone-api/wiki)

---

## 🙏 Acknowledgments

- MongoDB and Mongoose documentation
- Express.js community
- JWT best practices
- Security advisories from OWASP

---

**Last Updated:** January 2024  
**Version:** 1.0.0
