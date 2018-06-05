import chalk from 'chalk';

const c = {
  padstart: 5,
  padend: 2,

  // colors
  change: chalk.keyword('tomato'),
  equal: (...args) => chalk.greenBright(...args),
};

function getValue(value, key) {
  if (!value) return value;
  if (value instanceof Map) {
    return value.get(key);
  } else if (value instanceof Set) {
    return key;
  }
  return value[key];
}

function iterate(keys, from, to) {
  // console.log(chalk.cyan('> Equal'.padEnd(c.padstart)), chalk.green(':'.padEnd(c.padend)), strings.equal);
  if (typeof to === 'object') {
    if (to instanceof Map) {
      const vals = new Set();
      const diff = new Set();
      if (from instanceof Map) {
        from.forEach((v, k) => {
          if (to.get(k) === v) {
            return;
          }
          if (!to.has(k)) {
            diff.add([chalk.red('[delete]'.padEnd(c.padstart + 3)), k, v]);
          } else {
            vals.add(k);
            diff.add([c.change('[change]'.padEnd(c.padstart + 3)), k, v, to.get(k)]);
          }
        });
      }
      to.forEach((value, k) => {
        const prev = from && from.get(k);
        if (vals.has(k) || value === prev) {
          return;
        }
        vals.add(k);
        if (prev !== undefined) {
          diff.add([c.change('[change]'.padEnd(c.padstart + 3)), k, prev, value]);
        } else {
          diff.add([c.equal('[create]'.padEnd(c.padstart + 3)), k, prev, value]);
        }
      });

      diff.forEach(([type, k, prev, value]) => {
        console.group(type, c.change(`${typeColor(String(k))} => (`));
        printKV('Type', stringFromTo(typeColor(typeof prev), typeColor(typeof value)));
        printKV('Value', stringFromTo(typeColor(prev), typeColor(value)));
        if (typeof value === 'object') {
          console.group(c.change('{'));
          iterate([...keys, k], prev, value);
          console.groupEnd();
          console.log(c.change('}'));
        }
        console.groupEnd();
        console.log(c.change('),'));
      });
    } else if (to instanceof Set) {
      const diff = from instanceof Set ? new Set() : to;

      if (from instanceof Set) {
        to.forEach(v => {
          if (!from.has(v)) {
            diff.add([chalk.green('[add]'.padEnd(c.padstart + 3)), v]);
          }
        });
        from.forEach(v => {
          if (!to.has(v)) {
            diff.add([chalk.red('[delete]'.padEnd(c.padstart + 3)), v]);
          }
        });
      }

      diff.forEach(([type, value]) => {
        printKV(type, typeColor(typeof value), typeColor(value));
        // if (typeof value === 'object') {
        //   iterate(path, prev, value);
        // }
      });
    } else {
      Object.keys(to).forEach(key => {
        const prev = getValue(from, key);
        const value = getValue(to, key);
        const isEqual = prev === value;

        const path = [...keys, key];

        let sym = [];

        if (value && typeof value === 'object') {
          if (Array.isArray(value)) {
            sym = ['[', ']'];
          } else if (value instanceof Map) {
            sym = ['Map {', '}'];
          } else if (value instanceof Set) {
            sym = ['Set {', '}'];
          } else {
            sym = ['{', '}'];
          }
        }

        if (isEqual) {
          if (value && typeof value === 'object') {
            console.log(c.equal(`${key}: ${sym[0]} ... Equal ${sym[1]},`));
          } else {
            console.log(c.equal(`${key}: ${typeof value}`));
          }
        } else if (value && typeof value === 'object') {
          console.group(c.change(`${key}: ${sym[0]}`));
          iterate(path, prev, value);
          console.groupEnd();
          console.log(c.change(`${sym[1]},`));
        } else {
          console.group(c.change(`${key}: (`));
          printKV('Type', stringFromTo(typeColor(typeof prev), typeColor(typeof value)));
          printKV('Value', stringFromTo(typeColor(prev), typeColor(value, true)));
          console.groupEnd();
          console.log(c.change('),'));
        }
      });
    }
  } else {
    console.log(' VALUE');
  }
}

function typeColor(value, raw = false) {
  if (value === true || (!raw && value === 'true')) {
    return chalk.green('true');
  } else if (value === false || (!raw && value === 'false')) {
    return chalk.keyword('tomato')('false');
  } else if (!raw && value === 'object') {
    return chalk.keyword('orange')('object');
  } else if (value === 'number') {
    return chalk.keyword('orange')('number');
  } else if (value === undefined || (!raw && value === 'undefined')) {
    return chalk.italic.blueBright('undefined');
  } else if (!Number.isNaN(Number(value))) {
    return `${chalk.keyword('orange')(value)}`;
  } else if (!raw && value === 'string') {
    return chalk.greenBright(value);
  }

  if (typeof value === 'string') {
    return chalk.green(`"${value}"`);
  } else if (typeof value === 'object') {
    return value;
  }
  return chalk.keyword('beige')(value);
}

function printKV(key, ...values) {
  console.log(chalk.cyan(key.padEnd(c.padstart)), chalk.green('='.padEnd(c.padend)), ...values);
}

function stringFromTo(from, to, separator = '--->') {
  return `${from}  ${chalk.greenBright(separator)}  ${to}`;
}

export default function printDifference(from, to) {
  console.log(chalk.yellow('-----------------------------------------------'));
  console.group(chalk.yellow('------------------- Results -------------------'));
  if (from === to) {
    console.log(c.equal('state: { ...Equal  }'));
  } else {
    console.group(c.change('state: {'));
    iterate(['$state'], from, to);
    console.groupEnd();
    console.log(c.change('}'));
  }
  console.groupEnd();
  console.log(chalk.yellow('-----------------------------------------------'));
  console.log(chalk.yellow('-----------------------------------------------'));
}
