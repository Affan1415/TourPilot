"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  Cloud,
  Sun,
  CloudRain,
  Wind,
  Waves,
  Thermometer,
  Droplets,
  Eye,
  Compass,
  Sunrise,
  Sunset,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Navigation,
  Clock,
  CloudSun,
  CloudFog,
  Snowflake,
  CloudLightning,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface WeatherData {
  current: {
    temp: number;
    feels_like: number;
    humidity: number;
    wind_speed: number;
    wind_deg: number;
    wind_gust?: number;
    visibility: number;
    description: string;
    icon: string;
    uvi: number;
  };
  hourly: Array<{
    time: string;
    temp: number;
    wind_speed: number;
    description: string;
    icon: string;
    pop: number;
  }>;
  marine?: {
    wave_height: number;
    wave_period: number;
    wave_direction: number;
    water_temp: number;
    tide_status: string;
    next_tide: string;
  };
  alerts?: Array<{
    event: string;
    description: string;
    severity: string;
    start: string;
    end: string;
  }>;
  sun: {
    sunrise: string;
    sunset: string;
  };
  goNoGo: {
    status: "go" | "caution" | "no-go";
    reasons: string[];
  };
}

// Mock weather data - replace with actual API
const getMockWeather = (): WeatherData => ({
  current: {
    temp: 72,
    feels_like: 74,
    humidity: 65,
    wind_speed: 12,
    wind_deg: 225,
    wind_gust: 18,
    visibility: 10,
    description: "Partly cloudy",
    icon: "partly-cloudy",
    uvi: 6,
  },
  hourly: [
    { time: "10:00", temp: 72, wind_speed: 12, description: "Partly cloudy", icon: "partly-cloudy", pop: 10 },
    { time: "11:00", temp: 74, wind_speed: 14, description: "Mostly sunny", icon: "sunny", pop: 5 },
    { time: "12:00", temp: 76, wind_speed: 15, description: "Sunny", icon: "sunny", pop: 5 },
    { time: "13:00", temp: 78, wind_speed: 16, description: "Sunny", icon: "sunny", pop: 10 },
    { time: "14:00", temp: 79, wind_speed: 14, description: "Partly cloudy", icon: "partly-cloudy", pop: 15 },
    { time: "15:00", temp: 78, wind_speed: 13, description: "Partly cloudy", icon: "partly-cloudy", pop: 20 },
    { time: "16:00", temp: 76, wind_speed: 12, description: "Cloudy", icon: "cloudy", pop: 30 },
    { time: "17:00", temp: 74, wind_speed: 10, description: "Cloudy", icon: "cloudy", pop: 25 },
  ],
  marine: {
    wave_height: 2.5,
    wave_period: 6,
    wave_direction: 210,
    water_temp: 68,
    tide_status: "incoming",
    next_tide: "High tide at 2:45 PM",
  },
  alerts: [],
  sun: {
    sunrise: "6:32 AM",
    sunset: "7:48 PM",
  },
  goNoGo: {
    status: "go",
    reasons: [],
  },
});

const getWindDirection = (deg: number): string => {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return directions[Math.round(deg / 45) % 8];
};

const getWeatherIcon = (icon: string, size: "sm" | "lg" = "sm") => {
  const sizeClass = size === "lg" ? "h-16 w-16" : "h-6 w-6";
  switch (icon) {
    case "sunny":
      return <Sun className={cn(sizeClass, "text-yellow-500")} />;
    case "partly-cloudy":
      return <CloudSun className={cn(sizeClass, "text-yellow-400")} />;
    case "cloudy":
      return <Cloud className={cn(sizeClass, "text-slate-400")} />;
    case "rain":
      return <CloudRain className={cn(sizeClass, "text-blue-500")} />;
    case "fog":
      return <CloudFog className={cn(sizeClass, "text-slate-400")} />;
    case "snow":
      return <Snowflake className={cn(sizeClass, "text-blue-300")} />;
    case "storm":
      return <CloudLightning className={cn(sizeClass, "text-purple-500")} />;
    default:
      return <Cloud className={cn(sizeClass, "text-slate-400")} />;
  }
};

export default function WeatherPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchWeather();
  }, []);

  const fetchWeather = async () => {
    setLoading(true);
    try {
      // In production, fetch from weather API
      // For now, use mock data
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setWeather(getMockWeather());
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching weather:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchWeather();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading weather data...</p>
        </div>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="max-w-md p-8 text-center">
          <AlertTriangle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Weather Unavailable</h2>
          <p className="text-muted-foreground mb-4">
            Unable to fetch weather data. Please try again.
          </p>
          <Button onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 to-background dark:from-blue-950/10">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/captain")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Cloud className="h-5 w-5 text-blue-600" />
              Weather & Marine
            </h1>
            <p className="text-sm text-muted-foreground">
              Updated {format(lastUpdated, "h:mm a")}
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-4xl mx-auto">
        {/* Go/No-Go Status */}
        <Card
          className={cn(
            "border-2",
            weather.goNoGo.status === "go" && "border-green-300 bg-green-50 dark:bg-green-950/30",
            weather.goNoGo.status === "caution" && "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30",
            weather.goNoGo.status === "no-go" && "border-red-300 bg-red-50 dark:bg-red-950/30"
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "h-16 w-16 rounded-full flex items-center justify-center",
                  weather.goNoGo.status === "go" && "bg-green-500",
                  weather.goNoGo.status === "caution" && "bg-yellow-500",
                  weather.goNoGo.status === "no-go" && "bg-red-500"
                )}
              >
                {weather.goNoGo.status === "go" ? (
                  <CheckCircle2 className="h-8 w-8 text-white" />
                ) : (
                  <AlertTriangle className="h-8 w-8 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  {weather.goNoGo.status === "go" && "Good to Go"}
                  {weather.goNoGo.status === "caution" && "Use Caution"}
                  {weather.goNoGo.status === "no-go" && "Not Recommended"}
                </h2>
                <p className="text-muted-foreground">
                  {weather.goNoGo.status === "go"
                    ? "Weather conditions are favorable for tours"
                    : weather.goNoGo.reasons.join(", ")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weather Alerts */}
        {weather.alerts && weather.alerts.length > 0 && (
          <Card className="border-red-300 bg-red-50 dark:bg-red-950/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Weather Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {weather.alerts.map((alert, index) => (
                <div key={index} className="p-3 bg-white dark:bg-slate-800 rounded-lg">
                  <p className="font-semibold text-red-700 dark:text-red-300">
                    {alert.event}
                  </p>
                  <p className="text-sm text-muted-foreground">{alert.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Current Weather */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <div className="text-center">
                {getWeatherIcon(weather.current.icon, "lg")}
                <p className="text-sm text-muted-foreground mt-2">
                  {weather.current.description}
                </p>
              </div>
              <div className="flex-1">
                <div className="text-5xl font-bold">{weather.current.temp}°F</div>
                <p className="text-muted-foreground">
                  Feels like {weather.current.feels_like}°F
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
              <div className="text-center">
                <Wind className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                <p className="font-semibold">{weather.current.wind_speed} mph</p>
                <p className="text-xs text-muted-foreground">
                  {getWindDirection(weather.current.wind_deg)} Wind
                </p>
              </div>
              <div className="text-center">
                <Droplets className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                <p className="font-semibold">{weather.current.humidity}%</p>
                <p className="text-xs text-muted-foreground">Humidity</p>
              </div>
              <div className="text-center">
                <Eye className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                <p className="font-semibold">{weather.current.visibility} mi</p>
                <p className="text-xs text-muted-foreground">Visibility</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Marine Conditions */}
        {weather.marine && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Waves className="h-5 w-5 text-blue-600" />
                Marine Conditions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <Waves className="h-6 w-6 mx-auto text-blue-600 mb-2" />
                  <p className="text-2xl font-bold">{weather.marine.wave_height} ft</p>
                  <p className="text-xs text-muted-foreground">Wave Height</p>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <Clock className="h-6 w-6 mx-auto text-blue-600 mb-2" />
                  <p className="text-2xl font-bold">{weather.marine.wave_period}s</p>
                  <p className="text-xs text-muted-foreground">Wave Period</p>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <Thermometer className="h-6 w-6 mx-auto text-blue-600 mb-2" />
                  <p className="text-2xl font-bold">{weather.marine.water_temp}°F</p>
                  <p className="text-xs text-muted-foreground">Water Temp</p>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <Navigation className="h-6 w-6 mx-auto text-blue-600 mb-2" />
                  <p className="text-lg font-bold capitalize">
                    {weather.marine.tide_status}
                  </p>
                  <p className="text-xs text-muted-foreground">Tide</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-4 text-center">
                {weather.marine.next_tide}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Hourly Forecast */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Hourly Forecast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-4 px-4">
              <div className="flex gap-4 min-w-max pb-2">
                {weather.hourly.map((hour, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg min-w-[80px]"
                  >
                    <p className="text-sm font-medium text-muted-foreground">
                      {hour.time}
                    </p>
                    {getWeatherIcon(hour.icon)}
                    <p className="font-bold mt-1">{hour.temp}°</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Wind className="h-3 w-3" />
                      {hour.wind_speed}
                    </div>
                    {hour.pop > 10 && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {hour.pop}%
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sunrise/Sunset */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-around">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Sunrise className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sunrise</p>
                  <p className="font-semibold">{weather.sun.sunrise}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Sunset className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sunset</p>
                  <p className="font-semibold">{weather.sun.sunset}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wind Thresholds Info */}
        <Card className="bg-slate-50 dark:bg-slate-800/50">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Compass className="h-4 w-4" />
              Operating Thresholds
            </h3>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="text-center p-2 bg-green-100 dark:bg-green-900/30 rounded">
                <p className="font-semibold text-green-700 dark:text-green-300">
                  0-15 mph
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">Ideal</p>
              </div>
              <div className="text-center p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded">
                <p className="font-semibold text-yellow-700 dark:text-yellow-300">
                  15-20 mph
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">Caution</p>
              </div>
              <div className="text-center p-2 bg-red-100 dark:bg-red-900/30 rounded">
                <p className="font-semibold text-red-700 dark:text-red-300">
                  20+ mph
                </p>
                <p className="text-xs text-red-600 dark:text-red-400">No-Go</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
