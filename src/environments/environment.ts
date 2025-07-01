export const environment = {
  production: false,
  mongodb: {
    connectionString: 'MONGODB_URI=mongodb+srv://dustin:chung9705@quizcluster.vtrfozv.mongodb.net/?retryWrites=true&w=majority&appName=QuizCluster',
    // Hoặc MongoDB Atlas: 'mongodb+srv://username:password@cluster.mongodb.net/quiz-app'
    databaseName: 'quiz-app',
    collections: {
      questions: 'questions',
      practiceResults: 'practice-results'
    }
  },
  api: {
    baseUrl: 'https://quizlearningapp.onrender.com/api'
  }
};