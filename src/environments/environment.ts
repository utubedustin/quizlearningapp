export const environment = {
  production: false,
  mongodb: {
    connectionString: 'mongodb://localhost:27017/quiz-app',
    // Hoặc MongoDB Atlas: 'mongodb+srv://username:password@cluster.mongodb.net/quiz-app'
    databaseName: 'quiz-app',
    collections: {
      questions: 'questions',
      practiceResults: 'practice-results'
    }
  },
  api: {
    baseUrl: 'http://localhost:3000/api'
  }
};