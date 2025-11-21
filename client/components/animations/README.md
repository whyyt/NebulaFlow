# GSAP Animations

This directory contains reusable GSAP animation components for the Web3 challenge platform.

## Components

### FadeIn
Fade in with slight Y-axis movement.

```tsx
<FadeIn delay={0.2} duration={0.8} y={30}>
  <div>Content</div>
</FadeIn>
```

### SlideInLeft / SlideInRight
Slide in from left or right with scroll trigger support.

```tsx
<SlideInLeft delay={0.2} trigger={true}>
  <div>Content</div>
</SlideInLeft>
```

### ScaleIn
Scale up animation with scroll trigger support.

```tsx
<ScaleIn delay={0.3} scale={0.8}>
  <div>Content</div>
</ScaleIn>
```

### FloatingOrb
Floating gradient orb with pulsing glow effect.

```tsx
<FloatingOrb size={400} color="rgba(59,130,246,0.3)" />
```

### ParticleField
Web3-style floating particles background.

```tsx
<ParticleField count={20} />
```

### TextReveal
Letter-by-letter or word-by-word text reveal animation.

```tsx
<TextReveal delay={0.5} splitBy="char">
  Your Text Here
</TextReveal>
```

## Hooks

### useGsapTimeline
Reusable hook for creating GSAP timelines with proper cleanup.

```tsx
const { timeline, ctx } = useGsapTimeline();
```

## Usage Notes

- All components are client-side only (`"use client"`)
- ScrollTrigger is automatically registered
- All animations cleanup properly on unmount
- Use `trigger={false}` to disable scroll triggers for immediate animations

