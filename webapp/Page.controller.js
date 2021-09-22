sap.ui.define([
        "sap/ui/core/library",
        "sap/ui/core/Fragment",
        "sap/ui/core/mvc/Controller",
        "sap/ui/core/format/DateFormat",
        "sap/ui/model/json/JSONModel",
        "sap/ui/unified/library",
        "sap/m/MessageToast",
    ],
    function (coreLibrary, Fragment, Controller, DateFormat, JSONModel, unifiedLibrary, MessageToast) {
        "use strict";

        var CalendarDayType = unifiedLibrary.CalendarDayType;
        var ValueState = coreLibrary.ValueState;

        return Controller.extend("sap.m.sample.SinglePlanningCalendarCreateApp.Page", {

            onInit: function () {

                var oModel = new JSONModel();
                oModel.setData({
                    startDate: new Date("2021", "9", "20"),
                    types: (function () {
                        var aTypes = [];
                        for (var key in CalendarDayType) {
                            aTypes.push({
                                type: CalendarDayType[key]
                            });
                        }
                        return aTypes;
                    })(),
                    appointments: [{
                        title: "John Miller",
                        type: CalendarDayType.Type05,
                        startDate: new Date("2021", "9", "20", "5", "0"),
                        endDate: new Date("2021", "9", "20", "6", "0")
                    }]
                });
                this.getView().setModel(oModel);

                oModel = new JSONModel();
                oModel.setData({allDay: false});
                this.getView().setModel(oModel, "allDay");
            },

            handleAppointmentSelect: function (oEvent) {
                var oAppointment = oEvent.getParameter("appointment"),
                    oStartDate,
                    oEndDate,
                    oTrimmedStartDate,
                    oTrimmedEndDate,
                    bAllDate,
                    oModel,
                    oView = this.getView();

                if ((!oAppointment || !oAppointment.getSelected()) && this._pDetailsPopover) {
                    this._pDetailsPopover.then(function (oResponsivePopover) {
                        oResponsivePopover.close();
                    });
                    return;
                }

                oStartDate = oAppointment.getStartDate();
                oEndDate = oAppointment.getEndDate();
                oTrimmedStartDate = new Date(oStartDate);
                oTrimmedEndDate = new Date(oEndDate);
                bAllDate = false;
                oModel = this.getView().getModel("allDay");

                this._setHoursToZero(oTrimmedStartDate);
                this._setHoursToZero(oTrimmedEndDate);

                if (oStartDate.getTime() === oTrimmedStartDate.getTime() && oEndDate.getTime() === oTrimmedEndDate.getTime()) {
                    bAllDate = true;
                }

                oModel.getData().allDay = bAllDate;
                oModel.updateBindings();

                if (!this._pDetailsPopover) {
                    this._pDetailsPopover = Fragment.load({
                        id: oView.getId(),
                        name: "sap.m.sample.SinglePlanningCalendarCreateApp.Details",
                        controller: this
                    }).then(function (oDetailsPopover) {
                        oView.addDependent(oDetailsPopover);
                        return oDetailsPopover;
                    });
                }
                this._pDetailsPopover.then(function (oDetailsPopover) {
                    oDetailsPopover.setBindingContext(oAppointment.getBindingContext());
                    oDetailsPopover.openBy(oAppointment);
                });
            },

            handleEditButton: function () {
                // The sap.m.Popover has to be closed before the sap.m.Dialog gets opened
                var oDetailsPopover = this.byId("detailsPopover");
                oDetailsPopover.close();
                this.sPath = oDetailsPopover.getBindingContext().getPath();
                this._arrangeDialogFragment("Edit appointment");
            },

            handlePopoverDeleteButton: function () {
                var oModel = this.getView().getModel(),
                    oAppointments = oModel.getData().appointments,
                    oDetailsPopover = this.byId("detailsPopover"),
                    oAppointment = oDetailsPopover._getBindingContext().getObject();

                oDetailsPopover.close();

                oAppointments.splice(oAppointments.indexOf(oAppointment), 1);
                oModel.updateBindings();
            },

            _arrangeDialogFragment: function (sTitle) {
                var oView = this.getView();

                if (!this._pNewAppointmentDialog) {
                    this._pNewAppointmentDialog = Fragment.load({
                        id: oView.getId(),
                        name: "sap.m.sample.SinglePlanningCalendarCreateApp.Modify",
                        controller: this
                    }).then(function (oModifyDialog) {
                        oView.addDependent(oModifyDialog);
                        return oModifyDialog;
                    });
                }

                this._pNewAppointmentDialog.then(function (oModifyDialog) {
                    this._arrangeDialog(sTitle, oModifyDialog);
                }.bind(this));
            },

            _arrangeDialog: function (sTitle, oModifyDialog) {
                this._setValuesToDialogContent();
                oModifyDialog.setTitle(sTitle);
                oModifyDialog.open();
            },

            _setValuesToDialogContent: function () {
                var sStartDatePickerID = "DTPStartDate",
                    sEndDatePickerID = "DTPEndDate",
                    oTitleControl = this.byId("appTitle"),
                    oTextControl = this.byId("moreInfo"),
                    oStartDateControl = this.byId(sStartDatePickerID),
                    oEndDateControl = this.byId(sEndDatePickerID),
                    oContext,
                    oContextObject,
                    oSPCStartDate,
                    sTitle,
                    sText,
                    oStartDate,
                    oEndDate;

                if (this.sPath) {
                    oContext = this.byId("detailsPopover").getBindingContext();
                    oContextObject = oContext.getObject();
                    sTitle = oContextObject.title;
                    sText = oContextObject.text;
                    oStartDate = oContextObject.startDate;
                    oEndDate = oContextObject.endDate;
                } else {
                    sTitle = "";
                    sText = "";
                    oSPCStartDate = this.getView().byId("SPC1").getStartDate();
                    oStartDate = new Date(oSPCStartDate);
                    oStartDate.setHours(this._getDefaultAppointmentStartHour());
                    oEndDate = new Date(oSPCStartDate);
                    oEndDate.setHours(this._getDefaultAppointmentEndHour());
                }

                oTitleControl.setValue(sTitle);
                oTextControl.setValue(sText);
                oStartDateControl.setDateValue(oStartDate);
                oEndDateControl.setDateValue(oEndDate);
            },

            handleDialogOkButton: function () {
                var sStartDate = "DTPStartDate",
                    sEndDate = "DTPEndDate",
                    sTitle = this.byId("appTitle").getValue(),
                    sText = this.byId("moreInfo").getValue(),
                    oStartDate = this.byId(sStartDate).getDateValue(),
                    oEndDate = this.byId(sEndDate).getDateValue(),
                    oModel = this.getView().getModel(),
                    sAppointmentPath;

                if (this.byId(sStartDate).getValueState() !== "Error"
                    && this.byId(sEndDate).getValueState() !== "Error") {

                    if (this.sPath) {
                        sAppointmentPath = this.sPath;
                        oModel.setProperty(sAppointmentPath + "/title", sTitle);
                        oModel.setProperty(sAppointmentPath + "/text", sText);
                        oModel.setProperty(sAppointmentPath + "/type", sType);
                        oModel.setProperty(sAppointmentPath + "/startDate", oStartDate);
                        oModel.setProperty(sAppointmentPath + "/endDate", oEndDate);
                    } else {
                        oModel.getData().appointments.push({
                            title: sTitle,
                            text: sText,
                            startDate: oStartDate,
                            endDate: oEndDate
                        });
                    }

                    oModel.updateBindings();

                    this.byId("modifyDialog").close();
                }
            },

            formatDate: function (oDate) {
                if (oDate) {
                    var iHours = oDate.getHours(),
                        iMinutes = oDate.getMinutes(),
                        iSeconds = oDate.getSeconds();

                    if (iHours !== 0 || iMinutes !== 0 || iSeconds !== 0) {
                        return DateFormat.getDateTimeInstance({style: "medium"}).format(oDate);
                    } else {
                        return DateFormat.getDateInstance({style: "medium"}).format(oDate);
                    }
                }
                return "";
            },

            handleDialogCancelButton: function () {
                this.sPath = null;
                this.byId("modifyDialog").close();
            },

            handleCheckBoxSelect: function (oEvent) {
                var bSelected = oEvent.getSource().getSelected(),
                    sStartDatePickerID = bSelected ? "DTPStartDate" : "DPStartDate",
                    sEndDatePickerID = bSelected ? "DTPEndDate" : "DPEndDate",
                    oOldStartDate = this.byId(sStartDatePickerID).getDateValue(),
                    oNewStartDate = new Date(oOldStartDate),
                    oOldEndDate = this.byId(sEndDatePickerID).getDateValue(),
                    oNewEndDate = new Date(oOldEndDate);

                if (!bSelected) {
                    oNewStartDate.setHours(this._getDefaultAppointmentStartHour());
                    oNewEndDate.setHours(this._getDefaultAppointmentEndHour());
                } else {
                    this._setHoursToZero(oNewStartDate);
                    this._setHoursToZero(oNewEndDate);
                }

                sStartDatePickerID = !bSelected ? "DTPStartDate" : "DPStartDate";
                sEndDatePickerID = !bSelected ? "DTPEndDate" : "DPEndDate";
                this.byId(sStartDatePickerID).setDateValue(oNewStartDate);
                this.byId(sEndDatePickerID).setDateValue(oNewEndDate);
            },

            _getDefaultAppointmentStartHour: function () {
                return 9;
            },

            _getDefaultAppointmentEndHour: function () {
                return 10;
            },

            _setHoursToZero: function (oDate) {
                oDate.setHours(0, 0, 0, 0);
            },

            handleAppointmentCreate: function () {
                this._createInitialDialogValues(this.getView().byId("SPC1").getStartDate());
            },

            handleHeaderDateSelect: function (oEvent) {
                this._createInitialDialogValues(oEvent.getParameter("date"));
            },

            _createInitialDialogValues: function (oDate) {
                var oStartDate = new Date(oDate),
                    oEndDate = new Date(oStartDate);

                oStartDate.setHours(this._getDefaultAppointmentStartHour());
                oEndDate.setHours(this._getDefaultAppointmentEndHour());
                this.sPath = null;

                this._arrangeDialogFragment("Create appointment");
            },

            handleStartDateChange: function (oEvent) {
                var oStartDate = oEvent.getParameter("date");
                MessageToast.show("'startDateChange' event fired.\n\nNew start date is " + oStartDate.toString());
            },

            updateButtonEnabledState: function (oDateTimePickerStart, oDateTimePickerEnd, oButton) {
                var bEnabled = oDateTimePickerStart.getValueState() !== "Error"
                    && oDateTimePickerStart.getValue() !== ""
                    && oDateTimePickerEnd.getValue() !== ""
                    && oDateTimePickerEnd.getValueState() !== "Error";

                oButton.setEnabled(bEnabled);
            },

            handleDateTimePickerChange: function () {
                var oDateTimePickerStart = this.byId("DTPStartDate"),
                    oDateTimePickerEnd = this.byId("DTPEndDate"),
                    oStartDate = oDateTimePickerStart.getDateValue(),
                    oEndDate = oDateTimePickerEnd.getDateValue(),
                    bEndDateBiggerThanStartDate = oEndDate.getTime() <= oStartDate.getTime(),
                    bErrorState = oStartDate && oEndDate && bEndDateBiggerThanStartDate;

                this._setDateValueState(oDateTimePickerStart, bErrorState);
                this._setDateValueState(oDateTimePickerEnd, bErrorState);
                this.updateButtonEnabledState(oDateTimePickerStart, oDateTimePickerEnd, this.byId("modifyDialog").getBeginButton());
            },

            handleDatePickerChange: function () {
                var oDatePickerStart = this.byId("DPStartDate"),
                    oDatePickerEnd = this.byId("DPEndDate"),
                    oStartDate = oDatePickerStart.getDateValue(),
                    oEndDate = oDatePickerEnd.getDateValue(),
                    bEndDateBiggerThanStartDate = oEndDate.getTime() < oStartDate.getTime(),
                    bErrorState = oStartDate && oEndDate && bEndDateBiggerThanStartDate;

                this._setDateValueState(oDatePickerStart, bErrorState);
                this._setDateValueState(oDatePickerEnd, bErrorState);
                this.updateButtonEnabledState(oDatePickerStart, oDatePickerEnd, this.byId("modifyDialog").getBeginButton());
            },

            _setDateValueState: function (oPicker, bErrorState) {
                var sValueStateText = "Start date should be before End date";

                if (bErrorState) {
                    oPicker.setValueState(ValueState.Error);
                    oPicker.setValueStateText(sValueStateText);
                } else {
                    oPicker.setValueState(ValueState.None);
                }
            }

        });
    });
