import authRouter from './Modules/auth/auth.router.js'
import invitationRouter from './Modules/invitation/invitation.router.js'
import prayerTimesRouter from './Modules/prayerTimes/prayerTimes.router.js'
import nextFridayRouter from './Modules/nextFriday/nextFriday.router.js'
import eventRouter from './Modules/event/event.router.js'
import contributionRouter from './Modules/contribution/contribution.router.js'
import courseRouter from './Modules/course/course.router.js'
import enrollmentRouter from './Modules/enrollment/router.enrollment.js'
import facilityRouter from './Modules/mosque-facility-rent/router.facility.js'
import postRouter from './Modules/Posts/Posts.router.js'
import marksRouter from './Modules/course/marks/marks.router.js'
import coursePostRouter from './Modules/course/post/post.router.js'
import successStoryRouter from './Modules/successStory/success.router.js'
import ourTeacherRouter from './Modules/ourTeacher/teacher.router.js'
import cors from 'cors'

const initApp = (app, express, next) => {

  // Production traffic reaches Node through one Nginx proxy on the same VPS.
  app.set('trust proxy', 1);

  app.use(express.json());
  app.use(cors({
    origin: "http://localhost:5173", // frontend URL
    credentials: true
  }));

  // Abuzaid Mosque API routes
  app.use("/auth", authRouter)
  app.use("/invitations", invitationRouter)
  app.use("/prayer-times", prayerTimesRouter)
  app.use("/next-friday", nextFridayRouter)
  app.use("/event", eventRouter)
  app.use("/contribution", contributionRouter)
  app.use("/course", courseRouter)
  app.use("/enrollment", enrollmentRouter)
  app.use("/facility-rent", facilityRouter)
  app.use("/posts", postRouter)
  app.use("/marks", marksRouter)
  app.use("/course-post", coursePostRouter)
  app.use("/success-story", successStoryRouter)
  app.use("/success-stories", successStoryRouter)
  app.use("/our-teacher", ourTeacherRouter)
  app.use("/our-teachers", ourTeacherRouter)




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
  if (err?.type === "entity.parse.failed" || (err instanceof SyntaxError && err.status === 400 && Object.hasOwn(err, "body"))) {
    return res.status(400).json({
      message: "Invalid JSON request body. Use double quotes and check for a missing quote or trailing comma.",
    });
  }
  console.error(err.stack); // optional: log errors in dev
  const authTokenError = ["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(err.name);
  const statusCode = err.statusCode ||
    (typeof err.cause === "number" ? err.cause : authTokenError ? 401 : 500);

if (process.env.NODE_ENV === 'development') {
  console.error(err.message);
  return res.status(statusCode).json({ message: err.message, stack: err.stack });
}
return res.status(statusCode).json({ message: statusCode >= 500 ? "Something went wrong." : err.message });

// stack The file and line number where the error was thrown.
  
});
 
}
export default initApp
