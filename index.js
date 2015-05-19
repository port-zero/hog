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

// Program Helpers

//  printUsage :: IO ()
var printUsage = function() {
  console.log("usage: hog [-h|--help]\n\twhere: -h|--help = please help me");
}

//  internalError :: IO ()
var internalError = function(err) {
  console.log('Internal error: ' + err);
  process.exit(1);
}

//  inb4 :: IO () | Solely Side Effect
var inb4 = function(args, err, errout) {
  var _h = last(args).get();

  if (err || errout) internalError('process list could not be obtained because of ' + err);

  if (args.length === 3 && _h == '-h' || _h == '--help') {
    printUsage();
    process.exit(0);
  }
  
  if (args.length > 2 && !contains(args, 'cpu') && !contains(args, 'mem')) {
    printUsage();
    process.exit(1);
  }
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
    console.log('There is a single culprit; it is '
                + hog[0].name
                + ' with '
                + hog[0][hoggy]
                + '% '
                + resolveHogString(hoggy)
                + ' used.'
              );
  } else {
    var _culprits = hog.map(function(h) {
          return '\t ' + h[hoggy] + '% ' + resolveHogString(hoggy) + ' used by ' + h.name;
    });
    console.log('There are multiple culprits; they are \n' + _culprits.join('\n'));
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
  return Number(head(nums).get()) + decimalPoint(tail(nums).get());
}

//  parseOut :: String -> [Hog]
var parseOut = function(out) {
  var hogs = [];
  out.split('\n').forEach(function(line) {
    var elements = line.replace(/\s+/, ' ').split(' ').filter(function(el) { return !!el; });
    var cpumem = elements.filter(function(el) { return el.match(/\d+,\d+/); });
    if (cpumem.length) hogs.push({
                        name: element(elements, 10).get(), 
                        mem: parseCpuMem(last(cpumem).get()),
                        cpu: parseCpuMem(head(cpumem).get())
                      });
  });
  return hogs;
}

var getHoggy = function(args) {
  if(args.length > 2) return last(args).get();
  else return HOG_DEFAULT;
}

//  main :: String -> IO ()
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
