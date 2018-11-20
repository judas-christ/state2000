export default function createStore(state, actions) {
  let globalState = clone(state);
  const wiredActions = wireStateToActions([], globalState, clone(actions));
  const handlers = [];

  return {
    get actions() {
      return wiredActions;
    },
    get state() {
      return globalState;
    },
    get subscribe() {
      return subscribe;
    }
  };

  function clone(target, source) {
    const out = {};
    let i;

    for (i in target) out[i] = target[i];
    for (i in source) out[i] = source[i];

    return out;
  }

  function setPartialState(path, value, source) {
    const target = {};
    if (path.length) {
      target[path[0]] =
        path.length > 1
          ? setPartialState(path.slice(1), value, source[path[0]])
          : value;
      return clone(source, target);
    }
    return value;
  }

  function getPartialState(path, source) {
    let i = 0;
    while (i < path.length) {
      source = source[path[i++]];
    }
    return source;
  }

  function wireAction(key, actions, path) {
    const action = actions[key];
    actions[key] = function(data) {
      let result = action(data);

      if (typeof result === "function") {
        result = result(getPartialState(path, globalState), actions);
      }

      if (
        result &&
        result !== (state = getPartialState(path, globalState)) &&
        !result.then // !isPromise
      ) {
        globalState = setPartialState(path, clone(state, result), globalState);
        handlers.forEach(handler => handler(globalState));
      }

      return result;
    };
  }

  function wireStateToActions(path, state, actions) {
    for (let key in actions) {
      typeof actions[key] === "function"
        ? wireAction(key, actions, path)
        : wireStateToActions(
            path.concat(key),
            (state[key] = clone(state[key])),
            (actions[key] = clone(actions[key]))
          );
    }

    return actions;
  }

  function subscribe(handler) {
    handlers.push(handler);
    return () => {
      const index = handlers.indexOf(handler);
      if (index >= 0) {
        handlers.splice(index, 1);
      }
    };
  }
}
