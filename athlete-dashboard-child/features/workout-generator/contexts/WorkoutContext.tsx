import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { WorkoutEvent } from '../events';
import { WorkoutPlan, WorkoutPreferences, GeneratorSettings, WorkoutState } from '../types/workout-types';
import { DashboardError } from '../../../dashboard/types';

interface WorkoutContextType {
    state: WorkoutState;
    dispatch: React.Dispatch<WorkoutAction>;
}

type WorkoutAction = 
    | { type: WorkoutEvent.FETCH_REQUEST }
    | { type: WorkoutEvent.FETCH_SUCCESS; payload: WorkoutPlan[] }
    | { type: WorkoutEvent.FETCH_ERROR; payload: string }
    | { type: WorkoutEvent.GENERATE_REQUEST }
    | { type: WorkoutEvent.GENERATE_SUCCESS; payload: WorkoutPlan }
    | { type: WorkoutEvent.GENERATE_ERROR; payload: string };

const initialState: WorkoutState = {
    isLoading: false,
    error: null,
    preferences: null,
    settings: null,
    currentWorkout: null,
    workoutHistory: []
};

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

function workoutReducer(state: WorkoutState, action: WorkoutAction): WorkoutState {
    switch (action.type) {
        case WorkoutEvent.FETCH_REQUEST:
            return { ...state, isLoading: true, error: null };
        case WorkoutEvent.FETCH_SUCCESS:
            return { ...state, isLoading: false, workoutHistory: action.payload };
        case WorkoutEvent.FETCH_ERROR:
            return { 
                ...state, 
                isLoading: false, 
                error: {
                    name: 'WorkoutError',
                    message: action.payload,
                    code: 'WORKOUT_FETCH_ERROR',
                    timestamp: Date.now()
                }
            };
        case WorkoutEvent.GENERATE_REQUEST:
            return { ...state, isLoading: true, error: null };
        case WorkoutEvent.GENERATE_SUCCESS:
            return {
                ...state,
                isLoading: false,
                currentWorkout: action.payload,
                workoutHistory: [...state.workoutHistory, action.payload]
            };
        case WorkoutEvent.GENERATE_ERROR:
            return { 
                ...state, 
                isLoading: false, 
                error: {
                    name: 'WorkoutError',
                    message: action.payload,
                    code: 'WORKOUT_GENERATE_ERROR',
                    timestamp: Date.now()
                }
            };
        default:
            return state;
    }
}

export function WorkoutProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(workoutReducer, initialState);

    return (
        <WorkoutContext.Provider value={{ state, dispatch }}>
            {children}
        </WorkoutContext.Provider>
    );
}

export function useWorkout() {
    const context = useContext(WorkoutContext);
    if (context === undefined) {
        throw new Error('useWorkout must be used within a WorkoutProvider');
    }
    return context;
} 