export interface SwiperImageItem {
	src: string;
	fallback: string;
	lazy: boolean;
	objectFit: string;
	objectPosition: string;
}

export type ListRecord = Record<string, unknown>;

export type ComponentLifecycleHandler = (
	componentKey: string,
	lifetime: string,
	payload?: unknown,
) => void;
