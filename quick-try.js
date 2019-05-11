import immuta, { mergeWithDraft } from './src';
import printDifference from './src/utils/print-difference';

console.log(mergeWithDraft);

const state = {
  curr: 'something cool',
  todos: [1, 2, 3],
};

let next = immuta(state, draft => {
  draft.todos.push(4);
});

next = immuta(next, draft => {
  draft.curr = '';
});

printDifference(state, next);
