import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore
import Chessground from 'react-chessground';
import 'react-chessground/dist/styles/chessground.css';
import './App.css';
// eslint-disable-line
import { ChessInstance, Square } from 'chess.js';
import Confetti from 'react-confetti';
import KofiComp from './Kofi';

// @ts-ignore
const ChessReq: any = require('chess.js');
const Chess: ChessInstance = new ChessReq('7N/8/8/3q4/8/8/8/8 w - - 0 1');

const illegalToSquares: Square[] = [
  'a8',
  'b7',
  'c6',
  'e4',
  'f3',
  'g2',
  'h1',
  'c4',
  'b3',
  'a2',
  'e6',
  'f7',
  'g8',
  'd6',
  'd7',
  'd8',
  'd4',
  'd3',
  'd2',
  'd1',
  'a5',
  'b5',
  'c5',
  'e5',
  'f5',
  'g5',
  'h5',
  'd5',
];

const neededSquares: Square[] = [
  'f8',
  'e8',
  'c8',
  'b8',
  'h7',
  'g7',
  'e7',
  'c7',
  'a7',
  'h6',
  'g6',
  'f6',
  'b6',
  'a6',
  'h4',
  'g4',
  'f4',
  'b4',
  'a4',
  'h3',
  'g3',
  'e3',
  'c3',
  'a3',
  'h2',
  'f2',
  'e2',
  'c2',
  'b2',
  'g1',
  'f1',
  'e1',
  'c1',
  'b1',
  'a1',
];

const letterToNumber: {
  [key: string]: number
} = {
  a: 1,
  b: 2,
  c: 3,
  d: 4,
  e: 5,
  f: 6,
  g: 7,
  h: 8,
};

type Brush = 'green' | 'red'

export interface DrawShape {
  orig: Square;
  dest?: Square,
  brush: Brush;
}

const createShape = (orig: Square, dest: Square | null, brush: Brush): DrawShape => {
  return Object.assign({}, {
    orig,
    ...(dest ? { dest } : {}),
    brush: brush,
  });
};

type Move = {
  orig: Square,
  dest: Square,
}

type IntervalFunction = () => (unknown | void)

function useInterval (callback: IntervalFunction, delay: number | null) {
  const savedCallback = useRef<IntervalFunction | null>();

  // Remember the latest function.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick () {
      savedCallback.current && savedCallback.current();
    }

    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

function useLocalStorage (key: string, initialValue: Score[]) {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState(() => {
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.log(error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = (value: Score) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to local storage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.log(error);
    }
  };

  return [storedValue, setValue];
}

type Score = {
  time: number,
  won: boolean,
  squaresReached: number
}

const formatTime = (t: number) => {
  return (t / 1000).toFixed(1);
};

function getWindowDimensions() {
  const { innerWidth: width, innerHeight: height } = window;
  return {
    width,
    height
  };
}

function useWindowDimensions() {
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());

  useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions());
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowDimensions;
}

function App () {
  const [chess] = useState(Chess);
  const [lost, setLost] = useState(false);
  const [won, setWon] = useState(false);
  const [finished, setFinished] = useState(false);
  const [neededSquaresIndex, setNeededSquaresIndex] = useState(0)
  const [errorSquares, setErrorSquares] = useState<DrawShape[]>([]);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isTimerRunning, setIsSetTimerRunning] = useState<boolean>(false);
  const [move, setMove] = useState<Move>();
  const [squaresReached, setSquaresReached] = useState(0);
  const [scores, setScores] = useLocalStorage('score', []);
  const [nextSquareShape, setNextSquareShape] = useState<DrawShape>(createShape(neededSquares[neededSquaresIndex], null, 'green'))
  const { height, width } = useWindowDimensions();

  useInterval(() => {
    setElapsedTime((t) => t + 100);
  }, isTimerRunning ? 100 : null);

  useEffect(() => {
    if (move && elapsedTime === 0) {
      setIsSetTimerRunning(true);
    }

    if (!finished && (won || lost)) {
      setScores((ss: Score[]) => ss.concat([{
        squaresReached,
        time: elapsedTime,
        won,
      }]));
      setFinished(true)
    }

    if (move && move.orig === 'd5') {
      setErrorSquares([createShape(move.orig, null, 'red')]);
      setIsSetTimerRunning(false);
      setLost(true);
      return;
    }

    if (move && !isLegalKnightMove(move.orig, move.dest)) {
      setErrorSquares([createShape(move.orig, move.dest, 'red'), createShape(move.orig, move.dest, 'red')]);
      setIsSetTimerRunning(false);
      setLost(true);
      return;
    }
    if (move && illegalToSquares.includes(move.dest)) {
      setErrorSquares([createShape(move.dest, null, 'red')]);
      setIsSetTimerRunning(false);
      setLost(true);
      return;
    }
    if (move && move.dest === neededSquares[neededSquaresIndex]) {
      setSquaresReached((c) => c + 1);
      if (!(won || lost)) {
        setNeededSquaresIndex(c => c + 1);
        if (neededSquaresIndex + 1 < neededSquares.length) {
          setNextSquareShape(createShape(neededSquares[neededSquaresIndex + 1], null, 'green'));
        } else {
          setIsSetTimerRunning(false);
          setWon(true);
        }
      }
    }

  }, [move, won, lost]);

  const isLegalKnightMove = (from: Square, to: Square): boolean => {
    if (
      Math.abs(letterToNumber[from[0]] - (letterToNumber[to[0]])) === 2 &&
      Math.abs(parseInt(from[1]) - parseInt(to[1])) === 1
    ) {
      return true;
    }
    if (
      Math.abs(letterToNumber[from[0]] - (letterToNumber[to[0]])) === 1 &&
      Math.abs(parseInt(from[1]) - parseInt(to[1])) === 2
    ) {
      return true;
    }
    return false;
  };
  return (
    <div className="App">
      {won && <Confetti/>}
      <div style={{ padding: '20px', fontSize: '20px'}}>Knight and Queen Game</div>
      <div style={{padding: '0 10% 20px 10%'}}>
        Objective: Get to every square of the board that is not attacked by the queen (without capturing it either), left to right, top to bottom
        <div><a href={"https://www.youtube.com/watch?v=SrQlpY_eGYU"} target={"_blank"} rel="noreferrer">Inspired by Ben Finegold</a></div>
      </div>
      <div style={{ marginLeft: `calc(50% - ${width < 512 ? (width/2) - 25 : 256}px)`}}>
        <Chessground
          width={width < 512 ? width - 50 : 512}
          height={width < 512 ? width - 50 : 512}
          fen={chess.fen()}
          movable={{
            free: !lost && !won,
          }}
          turnColor="white"
          drawable={{
            enabled: false,
            autoShapes: [nextSquareShape, ...errorSquares],
            brushes: {
              green: { key: 'g', color: '#15781B', opacity: 1, lineWidth: 10 },
              red: { key: 'r', color: '#f10055', opacity: 1, lineWidth: 10 },
            },
          }}
          onMove={(orig: Square, dest: Square) => {
            if (orig !== 'd5') {
              chess.remove(orig);
              chess.put({ type: chess.KNIGHT, color: chess.WHITE }, dest);
            }
            setMove({ orig, dest });

          }}
        />
      </div>
      <div style={{ marginTop: '20px' }}>
        <button onClick={() => window.location.reload()}>Retry</button>
        <div style={{ fontSize: '40px', marginTop: '20px', color: lost ? 'red' : won ? 'green' : 'black' }}>
          <div>Time: {formatTime(elapsedTime)}</div>
          <div>Squares reached: {squaresReached}</div>
        </div>

      </div>
      <div style={{ marginTop: '20px', maxHeight: '250px', overflow: 'scroll'}}>
        {scores.length > 0 && <div style={{fontSize: '19px', marginBottom: '15px'}}>Your scores:</div>}
        {scores.sort((ps: Score, ns: Score) => {
          if (ps.won && !ns.won) {
            return - 1
          }
          if (!ps.won && !ns.won) {
            return ns.squaresReached - ps.squaresReached
          }
          if (ps.won && ns.won) {
            return ps.time - ns.time
          }
        }).map((s: Score, index: number) => {
          return <div key={index}>
            {s.won ? <span style={{color: 'green'}}>Won: </span> : 'Lost: '}
            {s.won? <span>Time: {formatTime(s.time)}</span> : <span>{s.squaresReached} Squares</span>}
          </div>;
        })}
      </div>
      <div style={{padding: '20px'}}>
        <KofiComp />
      </div>
    </div>
  );
}

export default App;
