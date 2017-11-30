var input = document.getElementById("input");
var output = document.getElementById("output");
var codeoutput = document.getElementById("codeoutput");
var errorDiv = document.getElementById("errorDiv");
var parser = new Gherkin.Parser();
parser.stopAtFirstError = false;

var clipboard = new Clipboard('.btn', {
  target: function() {
    return codeoutput;
  }
});

function copyCode() {
  codeoutput.select();
  document.execCommand("Copy");
  alert("Code copied to clipboard");
}

function parse() {
  var result;
  var json;
  errorDiv.style = "display: none;"
  codeoutput.innerText = '\r\r\r\r\r\r\r\r\r\r\r\r\r\r\r\r\r\r\r\r\r\r\r\r\r\r\r\r\r\r\r\r\r\r\r\r\r\r\r\r\r\r\r\r\r';

  try {
    var ast = parser.parse(input.value);
    result = JSON.stringify(ast, null, 2);
    json = JSON.parse(result);
  } catch (e) {
    console.log(e);
    result = e.stack;
    errorDiv.innerText = e.message;
    errorDiv.style = "display: display;"
  }
  // output.innerText = result;
  outputCode(json);
}

function removeStringParam(str) {
  return str.replace(/\".*"/, "");
}

function toTitleCase(str) {
  return str.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

function removeSpaces(str) {
  return str.replace(/\s/g, "");
}

function toMethod(str) {
  let result = removeStringParam(str);
  result = toTitleCase(result);
  result = removeSpaces(result);
  return result;
}

function getBackgroundMethods(json, methods) {
  let hasBackground = json.feature.children.find(function(x) {
    if (x.type === "Background") {
      return true;
    }
  });

  let background = json.feature.children.find(function(x) {
    if (x.type === "Background") {
      return x;
    }
  });

  if (hasBackground) {
    let methodsCalls = ``;
    let backgroundMethods = ``;

    for (let i = 0; i < background.steps.length; i++) {
      let step = background.steps[i];
      let keyword = step.keyword.replace(/ /g, "");
      let method = toMethod(step.text);
      let methodArgValue = ``;
      let methodArg = ``;

      let hasStringArg = step.argument !== undefined;
      if (hasStringArg) {
        methodArgValue = `@"${step.argument.content}"`;
        methodArg = `string value`;
      }

      backgroundMethods =
        backgroundMethods +
        `\t\tvoid ${method}(${methodArg}) \r\n \t\t{ \r\n \t\t} \r\n \r\n`;

      methodsCalls = methodsCalls + `\t\t\t${method}(${methodArg});\r\n`;
    }

    methods =
      methods +
      `\t\tvoid Background() \r\n \t\t{ \r\n${methodsCalls} \t\t} \r\n \r\n`;

    methods = methods + backgroundMethods;
  }

  return methods;
}

function outputCode(json) {
  let code = ``;

  let imports = `
    using System;
    using System.Linq;
    using NUnit.Framework;
    using TestStack.BDDfy;
  `;

  let namespaceStart = `
    namespace REPLACE_THIS_NAMESPACE
    {
  `;

  //"description": "as a coffee drinker named Joe\nI want to drink coffee\nSo that I am hyper",
  let asA = ``;
  let iWant = ``;
  let soThat = ``;
  if (json.feature.description !== undefined) {

    let descriptionLower = json.feature.description.toLowerCase();
    let description = json.feature.description;

    //asA
    let startIndex = descriptionLower.indexOf('as a');
    let length = description.indexOf('\n') - startIndex;
    asA = description.substr(startIndex, length);

    //iWant
    startIndex = descriptionLower.indexOf('i want');
    length = description.lastIndexOf('\n') - startIndex;
    iWant = description.substr(startIndex, length);

    //So that
    startIndex = descriptionLower.indexOf('so that');
    length = description.length - startIndex;
    soThat = description.substr(startIndex, length);
  }

  let classStart = `
  \t[TestFixture]
        [Story(
          AsA = "${asA}",
          IWant = "${iWant}",
          SoThat = "${soThat}")]
  \tpublic class ${toMethod(json.feature.name)}
  \t{
  `;

  let classEnd = `
    \t}
    `;

  let namespaceEnd = `
    }
    `;

  var scenarioIndex = json.feature.children.find(function(item, i) {
    if (item.type === "Scenario") {
      index = i;
      return i;
    }
  });

  let bddfyMethods = ``;
  let methods = ``;

  //BACKGROUND
  methods = getBackgroundMethods(json, methods);
  //END BACKGROUND

  //SCENARIOS
  let hasScenario = json.feature.children.find(function(x) {
    if (x.type === "Scenario") {
      return true;
    }
  });

  let scenarios = json.feature.children.filter(x => x.type === "Scenario");

  if (hasScenario) {
    for (let i = 0; i < scenarios.length; i++) {
      let scenario = scenarios[i];
      bddfyMethods =
        bddfyMethods +
        `
      \t\t[Test]
      \t\tpublic void ${toMethod(scenario.name)}()
      \t\t{
        \t\tthis
    `;

      let hasBackground = json.feature.children.find(function(x) {
        if (x.type === "Background") {
          return true;
        }
      });
      if (hasBackground) {
        bddfyMethods = bddfyMethods + `\t\t\t.Given(x => x.Background())\r\n`;
      }

      let scenarioCount = scenario.steps.length;
      for (let i = 0; i < scenarioCount; i++) {
        let step = scenario.steps[i];
        let keyword = step.keyword.replace(/ /g, "");
        let method = toMethod(step.text);
        let methodArgValue = ``;
        let methodArg = ``;

        let hasStringArg = step.argument !== undefined;
        if (hasStringArg) {
          methodArgValue = `@"${step.argument.content}"`;
          methodArg = `string value`;
        }

        let hasInlineStringArg = step.text.includes('"');
        if (hasInlineStringArg) {
          let startIndex = step.text.indexOf('"') + 1;
          let length = step.text.lastIndexOf('"') - startIndex;
          let argument = step.text.substr(startIndex, length);
          methodArgValue = `@"${argument}"`;
          methodArg = `string value`;
        }

        bddfyMethods =
          bddfyMethods +
          `\t\t\t.${keyword}(x => x.${method}(${methodArgValue}))\r\n`;

        let methodSignature = `void ${method}(${methodArg})`;
        if (methods.includes(methodSignature) === false) {
          methods =
            methods + `\t\t${methodSignature}\r\n \t\t{ \r\n \t\t} \r\n \r\n`;
        }
      }

      bddfyMethods = bddfyMethods + `\t\t\t.BDDfy();\r\n`;
      bddfyMethods = bddfyMethods + `\t\t} \r\n \r\n`;
    }
  }

  code =
    imports +
    namespaceStart +
    classStart +
    bddfyMethods +
    methods +
    classEnd +
    namespaceEnd;

  codeoutput.innerText = code;
}

input.onkeyup = function() {
  parse();
};

parse();