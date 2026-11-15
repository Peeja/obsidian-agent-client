/** How close to the bottom (px) counts as "at the bottom" for following new output. */
export const FOLLOW_THRESHOLD = 35;

/** Where a scroll container is: scrollTop, scrollHeight and clientHeight. */
export interface ScrollState {
	top: number;
	height: number;
	client: number;
}

/**
 * Whether the chat should keep following new output after a scroll event.
 *
 * Scrolling up stops following at once, however small the step: otherwise a
 * slow scroll stays within the threshold, the next streamed chunk snaps the
 * view back down, and the user can't get away from the bottom. The position
 * falling only counts as scrolling up when the content didn't shrink (content
 * shrinking also lowers scrollTop). Otherwise follow whenever the view is near
 * the bottom, so scrolling back down picks following up again.
 */
export function shouldFollow(
	previous: ScrollState | null,
	current: ScrollState,
): boolean {
	const movedUp =
		previous !== null &&
		current.top < previous.top - 1 &&
		current.height >= previous.height;
	if (movedUp) return false;
	return current.top + current.client >= current.height - FOLLOW_THRESHOLD;
}
