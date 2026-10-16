// The battle act's shot list (S27-S44), in order.
import { Shot } from './types';
import { FOREST_SHOTS } from './forest';
import { WASTES_SHOTS } from './wastes';
import { BOARD_SHOTS } from './board';

export const SHOTS: Shot[] = [...FOREST_SHOTS, ...WASTES_SHOTS, ...BOARD_SHOTS];
