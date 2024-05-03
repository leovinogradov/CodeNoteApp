/* Adapted from svelte's built-in flip animation */
import { cubicOut } from 'svelte/easing';
import { type FlipParams, type AnimationConfig } from 'svelte/animate';
import { is_function } from 'svelte/internal'
// import { is_function } from 'svelte/internal/index.js';

// function is_function(thing) {
// 	return typeof thing === 'function';
// }

/**
 * The flip function calculates the start and end position of an element and animates between them, translating the x and y values.
 * `flip` stands for [First, Last, Invert, Play](https://aerotwist.com/blog/flip-your-animations/).
 *
 * https://svelte.dev/docs/svelte-animate#flip
 * @param {Element} node
 * @param {{ from: DOMRect; to: DOMRect }} fromTo
 * @param {FlipParams} params
 * @returns {AnimationConfig}
 */
export function myflip(node, { from, to }, params: FlipParams = {}): AnimationConfig {
	// const defaultDurationFunc = (d) => Math.sqrt(d) * 120

	const style = getComputedStyle(node);
	// const transform = style.transform === 'none' ? '' : style.transform;
	const [ox, oy] = style.transformOrigin.split(' ').map(parseFloat);
	const dx = from.left + (from.width * ox) / to.width - (to.left + ox);
	const dy = from.top + (from.height * oy) / to.height - (to.top + oy);
	const { delay = 0, duration = 250, easing = cubicOut } = params;
	return {
		delay,
		// @ts-ignore
		// duration: is_function(duration) ? duration(Math.sqrt(dx * dx + dy * dy)) : duration,
		duration: duration, // always an number
		easing,
		css: (t, u) => {
			const x = u * dx;
			const y = u * dy;
			// const sx = t + (u * from.width) / to.width;
			// const sy = t + (u * from.height) / to.height;
			return `transform: translate(${x}px, ${y}px);`
			// return `transform: ${transform} translate(${x}px, ${y}px) scale(${sx}, ${sy});`;
		}
	};
}
