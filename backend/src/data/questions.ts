import type { Question } from "../types";

export const QUESTIONS: Question[] = [
  {
    id: "q1",
    text: "Quelle est la capitale de la France ?",
    choices: ["Lyon", "Marseille", "Paris", "Bordeaux"],
    correctIndex: 2,
    timeLimit: 20,
  },
  {
    id: "q2",
    text: "Combien font 7 × 8 ?",
    choices: ["54", "56", "48", "64"],
    correctIndex: 1,
    timeLimit: 15,
  },
  {
    id: "q3",
    text: "Quel est le plus grand océan du monde ?",
    choices: ["Atlantique", "Indien", "Arctique", "Pacifique"],
    correctIndex: 3,
    timeLimit: 20,
  },
  {
    id: "q4",
    text: "En quelle année a eu lieu la Révolution française ?",
    choices: ["1789", "1799", "1776", "1804"],
    correctIndex: 0,
    timeLimit: 20,
  },
  {
    id: "q5",
    text: 'Quel élément chimique a pour symbole "O" ?',
    choices: ["Or", "Osmium", "Oxygène", "Ozone"],
    correctIndex: 2,
    timeLimit: 15,
  },
];
