# Environment Setup

## Frontend Environment Variables

Create a `.env.local` file in the root of the braiding-shop directory with the following content:

```env
# Backend API URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080

# Add any other environment variables below
```

## Backend Environment Variables

The backend uses `application.properties` located at:
`/Users/gloriadjonret/Desktop/Backend-Braiding/src/main/resources/application.properties`

Make sure it contains:

```properties
# Database Configuration
spring.datasource.url=jdbc:postgresql://localhost:5432/braiding_db
spring.datasource.username=your_postgres_username
spring.datasource.password=your_postgres_password

# JPA/Hibernate
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect

# Server Port
server.port=8080
```

## Important Notes

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Update database credentials** - Replace with your actual PostgreSQL username/password
3. **Create database first** - Run `createdb braiding_db` before starting the backend
