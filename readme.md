# Distorto

Distorto is an interactive RGB distortion web application that allows users to create visually appealing text distortions in real-time.

## Features

- Real-time text distortion with WebGL
- Customizable text, font size, colors, and distortion parameters
- Responsive design for various screen sizes
- Randomize and reset functionality

## Live Demo

You can try out Distorto here: [https://distorto.vercel.app](https://distorto.vercel.app)


## Thanks

Inspired by a snip I can't find:

code:

```
[[stitchable]] half4 w(float2 p,SwiftUI::Layer a,float2 l,float2 v){float2 m=-vpow(clamp(1-length(l-p)/190,0.,1.),2)1.5;half3 c=0;for(float i=0;i<10;i++){float s=.175+.005i;c+=half3(a.sample(p+sm).r,a.sample(p+(s+.025)m).g,a.sample(p+(s+.05)m).b);}return half4(c/10,1);}
```