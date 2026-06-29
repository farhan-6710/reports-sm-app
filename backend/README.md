# Backend API Documentation

Social Media Analytics Backend API built with PHP.

## API Endpoints

### Reports

#### GET /api/reports.php/reports
Get all reports from database.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "platform": "facebook",
      "platform_id": "page_id",
      "start_date": "2024-01-01",
      "end_date": "2024-01-31",
      "data": "{...}",
      "type": "organic",
      "created_at": "2024-02-01 10:00:00"
    }
  ]
}
```

#### POST /api/reports.php/reports
Generate a new report.

**Request Body:**
```json
{
  "platform": "facebook",
  "platformId": "your_page_id",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "accessToken": "your_token",
  "type": "combined"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "platform": "facebook",
    "dates": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    },
    "metrics": {
      "organic": {
        "followers": 10000,
        "impressions": 50000,
        "reach": 30000,
        "engaged_users": 5000
      },
      "inorganic": {
        "spend": 1000,
        "reach": 20000,
        "impressions": 40000
      }
    }
  }
}
```

#### GET /api/reports.php/comparison
Get period comparison data.

**Query Parameters:**
- `platform`: facebook|instagram
- `platformId`: Platform ID
- `period`: week|month
- `accessToken`: Access token

**Response:**
```json
{
  "success": true,
  "data": {
    "current": {
      "organic": {...},
      "inorganic": {...}
    },
    "previous": {
      "organic": {...},
      "inorganic": {...}
    },
    "growth": {
      "followers": 5.2,
      "impressions": 12.5,
      "reach": -2.1
    }
  }
}
```

### Accounts

#### GET /api/accounts.php
Get all connected accounts.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "platform": "facebook",
      "account_name": "My Brand",
      "account_id": "page_id",
      "is_active": true,
      "created_at": "2024-01-01"
    }
  ]
}
```

#### POST /api/accounts.php
Add a new account.

**Request Body:**
```json
{
  "platform": "facebook",
  "account_name": "My Brand",
  "account_id": "page_id",
  "access_token": "token"
}
```

#### DELETE /api/accounts.php?id={id}
Deactivate an account.

**Response:**
```json
{
  "success": true,
  "message": "Account removed successfully"
}
```

## Configuration

### config.php
Main configuration file for API keys and settings.

### database.php
Database connection handler.

### schema.sql
Database schema with tables:
- `reports`: Store generated reports
- `accounts`: Connected social media accounts
- `users`: User management (future)

## Services

### FacebookService
Handles Facebook Graph API integration:
- Page insights
- Organic metrics
- Inorganic/paid metrics

### InstagramService
Handles Instagram Graph API integration:
- Account insights
- Post metrics
- Follower analytics

### TwitterService
Handles Twitter API integration (placeholder for future).

## Authentication

Currently uses simple token validation. In production, implement:
- JWT tokens
- OAuth 2.0 flows
- Rate limiting
- API key management

## Error Handling

All endpoints return JSON responses:
```json
{
  "success": false,
  "error": "Error message"
}
```

HTTP status codes:
- 200: Success
- 400: Bad request
- 401: Unauthorized
- 404: Not found
- 500: Server error

## Development

### Running Backend

```bash
php -S localhost:8000 -t api
```

### CORS

Configured to allow requests from `http://localhost:3000`. Update in `config.php` for production.

### Database

Use MySQL/MariaDB. Import schema:
```bash
mysql -u root -p < schema.sql
```

## Security Notes

⚠️ **Production Considerations:**
- Store tokens encrypted in database
- Use environment variables for secrets
- Implement HTTPS
- Add rate limiting
- Validate all inputs
- Sanitize outputs
- Use prepared statements (already implemented)
- Regular security audits

