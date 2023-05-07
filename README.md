# download-m3u8
🛠 A tool for downloading hls videos.

### ⚙️ Configuration : 
1. Open `.env` and put information such as the m3u8 url, the name of the video and the source of the request.
```yml
NAME=video_name
URL=https://somehost.com/master.m3u8
ORIGIN=https://vidmoly.to
BEST_QUALITY=true (Optional)
```

### 🔌 Startup :
Make sure you have [nodejs](https://nodejs.org/) up to date!  
The recommended version is node **18**.
1. Install the dependencies with : `npm install` / `yarn install`
2. Then run : `npm run start` / `yarn start`

Made by [Pronicio](https://pronicio.dev/) with ❤️.
