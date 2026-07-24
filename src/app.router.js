import connectDB from '../database/ConnectDB.js'
import authRouter from './Modules/auth/auth.router.js'
import prayerTimesRouter from './Modules/prayerTimes/prayerTimes.router.js'
import nextFridayRouter from './Modules/nextFriday/nextFriday.router.js'
import eventRouter from './Modules/event/event.router.js'
import contributionRouter from './Modules/contribution/contribution.router.js'
import courseRouter from './Modules/course/course.router.js'
// import postRouter from './Modules/Posts/Posts.router.js'
import cors from 'cors'

const initApp = (app, express, next) => {

  connectDB();

  app.use(express.json());
  app.use(cors({
    origin: "http://localhost:5173", // frontend URL
    credentials: true
  }));

  // Abuzaid Mosque API routes
  app.use("/auth", authRouter)
  app.use("/prayer-times", prayerTimesRouter)
  app.use("/next-friday", nextFridayRouter)
  app.use("/event", eventRouter)
  app.use("/contribution", contributionRouter)
  app.use("/course", courseRouter)
  // app.use("/posts", postRouter)




  // catch all routes - handle invalid routes
  app.use((req, res) => {
    res.status(404).json({ 
      message: "Route not found",
      error: `Cannot ${req.method} ${req.originalUrl}`,

    });
  });

  // global error handlers
  // Express will automatically pass errors to this middleware when next(error) is called anywhere.
app.use((err, req, res, next) => {
  console.error(err.stack); // optional: log errors in dev

if (process.env.NODE_ENV === 'development') {
  console.error(err.message);
  return res.status(err.statusCode || 500).json({ message: err.message, stack: err.stack });
}
return res.status(err.statusCode || 500).json({ message: "Something went wrong." });

// stack The file and line number where the error was thrown.
  
});
 
}
export default initApp
 