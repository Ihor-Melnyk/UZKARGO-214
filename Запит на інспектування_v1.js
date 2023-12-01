//Скрипт 1. Передача результату опрацювання документа в ESIGN

function onTaskExecuteMainTask(routeStage) {
  debugger;
  var signatures = [];
  var command = "RejectTask";
  if (CurrentDocument.inExtId) {
    if (routeStage.executionResult == "rejected") {
      var DocCommandData = {};

      DocCommandData.extSysDocID = CurrentDocument.id;
      DocCommandData.extSysDocVersion = CurrentDocument.version;
      DocCommandData.command = command;
      DocCommandData.legalEntityCode = EdocsApi.getAttributeValue("HomeOrgEDRPOU").value;
      DocCommandData.userEmail = EdocsApi.getEmployeeDataByEmployeeID(CurrentUser.employeeId).email;
      DocCommandData.userTitle = CurrentUser.fullName;
      DocCommandData.comment = routeStage.comment;
      //DocCommandData.signatures = signatures;

      routeStage.externalAPIExecutingParams = {
        externalSystemCode: "ESIGN1", // код зовнішньої системи
        externalSystemMethod: "integration/processDocCommand", // метод зовнішньої системи
        data: DocCommandData, // дані, що очікує зовнішня система для заданого методу
        executeAsync: false, // виконувати завдання асинхронно
      };

      setHiddenReg();
    }
  }
}

//Скрипт 2. Зміна властивостей атрибутів при створені документа
function setInitialRequired() {
  debugger;
  if (CurrentDocument.inExtId) {
    controlRequired("Registraion");
  }
}

function controlRequired(CODE, required = true) {
  const control = EdocsApi.getControlProperties(CODE);
  control.required = required;
  EdocsApi.setControlProperties(control);
}

function onCardInitialize() {
  setInitialRequired();
  setInitialDisabled();
}

function sendCommand(routeStage) {
  debugger;
  var command;
  var comment;
  if (routeStage.executionResult == "executed") {
    command = "CompleteTask";
    signatures = EdocsApi.getSignaturesAllFiles();
  } else {
    command = "RejectTask";
    comment = routeStage.comment;
  }

  var DocCommandData = {
    extSysDocID: CurrentDocument.id,
    extSysDocVersion: CurrentDocument.version,
    command: command,
    legalEntityCode: EdocsApi.getAttributeValue("HomeOrgEDRPOU").value,
    userEmail: EdocsApi.getEmployeeDataByEmployeeID(CurrentUser.employeeId).email,
    userTitle: CurrentUser.fullName,
    comment: comment,
    signatures: signatures,
  };

  routeStage.externalAPIExecutingParams = {
    externalSystemCode: "ESIGN1", // код зовнішньої системи
    externalSystemMethod: "integration/processDocCommand", // метод зовнішньої системи
    data: DocCommandData, // дані, що очікує зовнішня система для заданого методу
    executeAsync: false, // виконувати завдання асинхронно
  };
}

function sendComment(routeStage) {
  debugger;
  var orgCode = EdocsApi.getAttributeValue("HomeOrgEDRPOU").value;
  var orgShortName = EdocsApi.getAttributeValue("HomeOrgName").value;
  if (!orgCode || !orgShortName) {
    return;
  }
  var comment = `Ваш запит прийнято та зареєстровано за № ${EdocsApi.getAttributeValue("RegNumber").value} від ${moment(new Date(EdocsApi.getAttributeValue("RegDate").value)).format("DD.MM.YYYY")}`;
  var methodData = {
    extSysDocId: CurrentDocument.id,
    eventType: "CommentAdded",
    comment: comment,
    partyCode: orgCode,
    userTitle: CurrentUser.name,
    partyName: orgShortName,
    occuredAt: new Date(),
  };
  EdocsApi.runExternalFunction("ESIGN1", "integration/processEvent", methodData);
}

function onTaskExecuteSendOutDoc(routeStage) {
  debugger;
  if (routeStage.executionResult == "executed") {
    if (!EdocsApi.getAttributeValue("RegNumber").value) {
      throw "Спочатку зареєструйте документ!";
    }
    const state = EdocsApi.getCaseTaskDataByCode("ApproveRequest");
    if (state.state == "completed") {
      sendCommand(routeStage);
      sendComment();
    }
  }
}

function onTaskExecuteApproveRequest(routeStage) {
  debugger;
  if (routeStage.executionResult == "executed") {
    if (!EdocsApi.getAttributeValue("RegNumber").value) {
      throw "Спочатку зареєструйте документ!";
    }
    const state = EdocsApi.getCaseTaskDataByCode("SendOutDoc");
    if (state.state == "completed") {
      sendCommand(routeStage);
      sendComment();
    }
  }
}

//Скрипт 3. Неможливість внесення змін в поля карточки
function setInitialDisabled() {
  const stateTaskCheckDirectory = EdocsApi.getCaseTaskDataByCode("CheckDirectory").state;
  const stateTaskMainTask = EdocsApi.getCaseTaskDataByCode("MainTask").state;

  if (stateTaskCheckDirectory == "inProgress" || stateTaskMainTask == "rejected") {
    controlDisabled("Comment");
  } else {
    controlDisabled("Comment", false);
  }
}

function controlDisabled(CODE, disabled = true) {
  debugger;
  const control = EdocsApi.getControlProperties(CODE);
  control.disabled = disabled;
  EdocsApi.setControlProperties(control);
}

function controlHidden(CODE, hidden = true) {
  debugger;
  const control = EdocsApi.getControlProperties(CODE);
  control.hidden = hidden;
  EdocsApi.setControlProperties(control);
}

function onCreate() {
  setContractorOnCreate();
}

function setContractorOnCreate() {
  debugger;
  try {
    const data = EdocsApi.getInExtAttributes(CurrentDocument.id.toString());
    EdocsApi.setAttributeValue({ code: "ContractorRPEmail", value: data.tableAttributes.filter((x) => x.code == "ContactPersonEmail").map((y) => y.value)[0] });
  } catch (e) {
    EdocsApi.setAttributeValue({ code: "ContractorRPEmail", value: "" });
  }
}

function sendStatusToEsign(routeStage, command) {
  var DocCommandData = {
    extSysDocID: CurrentDocument.id,
    extSysDocVersion: CurrentDocument.version,
    command: command,
    comment: routeStage.comment,
    legalEntityCode: EdocsApi.getAttributeValue("HomeOrgEDRPOU").value,
    userEmail: EdocsApi.getEmployeeDataByEmployeeID(CurrentUser.employeeId).email,
    userTitle: CurrentUser.fullName,
    signatures: [],
  };

  routeStage.externalAPIExecutingParams = {
    externalSystemCode: "ESIGN1", // код зовнішньої системи
    externalSystemMethod: "integration/processDocCommand", // метод зовнішньої системи
    data: DocCommandData, // дані, що очікує зовнішня система для заданого методу
    executeAsync: false, // виконувати завдання асинхронно
  };
}

//передача коментара в єСайн, додаткових функцій не потрібно
function onTaskCommentedSendOutDoc(caseTaskComment) {
  debugger;
  var orgCode = EdocsApi.getAttributeValue("HomeOrgEDRPOU").value;
  var orgShortName = EdocsApi.getAttributeValue("HomeOrgName").value;
  if (!orgCode || !orgShortName) {
    return;
  }
  var idnumber = CurrentDocument.id;
  //EdocsApi.getAttributeValue("DocId");
  var methodData = {
    extSysDocId: idnumber,
    eventType: "CommentAdded",
    comment: caseTaskComment.comment,
    partyCode: orgCode,
    userTitle: CurrentUser.name,
    partyName: orgShortName,
    occuredAt: new Date(),
  };

  caseTaskComment.externalAPIExecutingParams = {
    externalSystemCode: "ESIGN1", // код зовнішньої системи
    externalSystemMethod: "integration/processEvent", // метод зовнішньої системи
    data: methodData, // дані, що очікує зовнішня система для заданого методу
    executeAsync: true, // виконувати завдання асинхронно
  };
}

function setHiddenReg() {
  controlHidden("Registraion");
  controlHidden("RegDate");
  controlHidden("RegNumber");
}
