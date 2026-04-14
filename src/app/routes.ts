import { createBrowserRouter } from "react-router";
import Layout from "./components/Layout";
import SplashScreen from "./components/SplashScreen";
import LiveMap from "./components/LiveMap";
import DroneFeed from "./components/DroneFeed";
import Forecast from "./components/Forecast";
import Weather from "./components/Weather";
import Alerts from "./components/Alerts";
import Profile from "./components/Profile";
import Insights from "./components/Insights";
import Assistant from "./components/Assistant";
import Auth from "./components/Auth";
import Onboarding from "./components/Onboarding";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: SplashScreen,
  },
  {
    path: "/auth",
    Component: Auth,
  },
  {
    path: "/onboarding",
    Component: Onboarding,
  },
  {
    path: "/app",
    Component: Layout,
    children: [
      { index: true, Component: LiveMap },
      { path: "drone-feed", Component: DroneFeed },
      { path: "forecast", Component: Forecast },
      { path: "weather", Component: Weather },
      { path: "alerts", Component: Alerts },
      { path: "profile", Component: Profile },
      { path: "insights", Component: Insights },
      { path: "assistant", Component: Assistant },
    ],
  },
]);