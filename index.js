#!/usr/bin/env node

var 
    exec  = require('child_process').exec
  , Maybe = require('data.maybe')
  ;

const HOG_DEFAULT = "mem";
const QUOTA = 25;

// data Hog = { name :: String, mem :: Number, cpu :: Number }

// Generic Helpers

//  head :: [a] -> Maybe a
var head = function(l) {
  return l.length ?
          Maybe.Just(l[0]) :
          Maybe.Nothing();
}

//  element :: [a] -> Number -> Maybe a
var element = function(l, i) {
  return l.length > i ?
          Maybe.Just(l[i]) :
          Maybe.Nothing();
}

//  tail :: [a] -> Maybe [a]
var tail = function(l) {
  return l.length ?
          Maybe.Just(l.splice(1, l.length)) :
          Maybe.Nothing();
}

//  last :: [a] -> Maybe a
var last = function(l) {
  return l.length ?
          Maybe.Just(l[l.length - 1]) :
          Maybe.Nothing();
}

//  contains :: [a] -> a -> Boolean
var contains = function(l, el) {
  return l.indexOf(el) != -1;
}

//  containsAny :: [a] -> [a] -> Boolean
var containsAny = function(l, els) {
  return l.reduce(function(p, c) { return contains(els, c) || p; });
}

//  defaultMaybe :: Maybe a -> a -> a
var defaultMaybe = function(maybe, d) {
  return maybe.cata({ Just: function(x) { return x; },
                      Nothing: function() { return d; }});
}

// Program Helpers

//  printUsage :: IO ()
var printUsage = function() {
  console.log("usage: hog [-h|--help] <cpu|mem>\n"
              + "\twhere: -h|--help = please help me\n"
              + "\t       cpu       = show cpu hogs\n"
              + "\t       mem       = show memory hogs\n"
              + "\t       default   = mem"
             );
}

//  internalError :: IO ()
var internalError = function(err) {
  console.log('Internal error: ' + err);
  process.exit(1);
}

//  inb4 :: Args -> Error -> String -> IO () | Solely Side Effect
var inb4 = function(args, err, errout) {
  var _inb4 = function() {
    if (err || errout) internalError('process list could not be obtained because of ' + err);

    if (args.length > 2 && 
        !containsAny(args, ['cpu', 'mem', '-h', '--help'])) {
      printUsage();
      process.exit(1);
    }
  };
  var _h = last(args).cata({
    Nothing: _inb4,
    Just: function(h) {
      _inb4();

      if (args.length === 3 && h == '-h' || h == '--help') {
        printUsage();
        process.exit(0);
      }
    }
  });
}

//  showNoone :: IO ()
var showNoone = function() {
  console.log('I could not find a single hog... Sorry.');
}

//  resolveHogString :: String
var resolveHogString = function(hoggy) {
  if(hoggy == 'mem') return 'memory';
  return hoggy;
}

// showHog :: [Hog] -> IO ()
var showHog = function(hog, hoggy) {
  if(hog.length == 1) {
    console.log(hog[0].name
                + ': the '
                + resolveHogString(hoggy)
                + ' is over '
                + hog[0][hoggy]
                + '(%)!!!'
              );
  } else {
    var _culprits = hog.map(function(h) {
          return '\t ' + h.name + ': the ' + resolveHogString(hoggy) + ' is over ' + h[hoggy] + '(%)!!!';
    });
    console.log('There are multiple culprits:\n' + _culprits.join('\n'));
  }
}

//  decimalPoint :: String -> Number
var decimalPoint = function(num) {
  if (num.length) return num / Math.pow(10, num.length);
  else return 0;
}

//  parseCpuMem :: String -> Number
var parseCpuMem = function(mem) {
  if (!mem) return 0;

  var nums = mem.split(',');
  return Number(defaultMaybe(head(nums), 0)) 
         + decimalPoint(defaultMaybe(tail(nums), []));
}

//  parseOut :: String -> [Hog]
var parseOut = function(out) {
  var hogs = [];
  out.split('\n').forEach(function(line) {
    var elements = line.replace(/\s+/, ' ').split(' ').filter(function(el) { return !!el; });
    var cpumem = elements.filter(function(el) { return el.match(/\d+,\d+/); });
    if (cpumem.length) hogs.push({
                        name: defaultMaybe(element(elements, 10), "no name"),
                        mem: parseCpuMem(defaultMaybe(last(cpumem), 0)),
                        cpu: parseCpuMem(defaultMaybe(head(cpumem), 0))
                      });
  });
  return hogs;
}

//  getHoggy :: Args -> String
var getHoggy = function(args) {
  if(args.length > 2) return defaultMaybe(last(args), "");
  else return HOG_DEFAULT;
}

//  main :: String -> Args -> IO ()
var main = function(out, args) {
  var hoggy = getHoggy(args);
  var hog = parseOut(out).filter(function(el) { return el[hoggy] > QUOTA; });
  
  if (!hog.length) showNoone();
  else showHog(hog, hoggy);
}

processes = exec('ps aux', function(err, stdout, stderr) {
  inb4(process.argv, err, stderr);
  main(stdout, process.argv);
});
