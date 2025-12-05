import React, { memo, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  DialogActions,
  Paper,
  Tooltip,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import DownloadIcon from "@mui/icons-material/Download";
import Draggable from "react-draggable";
import { Resizable } from "re-resizable";


import {
  capturePngWithHeader,
  CompareValuesWithSymbol,
  getFileNameFromUrl,
  getUserInfoAndTime,
  getValsBaseOnCondition,
} from "../../utills/CommonUtilities";

import { DEFAULT_TIMEZONE } from "../../utills/TimeUtilities";

const timezone = DEFAULT_TIMEZONE;

function PaperComponent(props) {
  const nodeRef = useRef(null);

  return (
    <Draggable
      nodeRef={nodeRef}
      handle="#draggable-dialog-title"
      cancel={'[class*="MuiDialogContent-root"]'}
    >
      <Paper {...props} ref={nodeRef} />
    </Draggable>
  );
}

const CustomModal = ({
  id = "custom-modal",
  title = "MODAL TITLE",
  children,
  open,
  onHide = () => {},
  modalWidth,
  modalHeight,
  size = "medium",
  modalActions,
  maxHeight,
  downloadConfig = {
    isVisible: false,
    path: "",
    toolTipMsg: "",
    fileName: "",
  },
}) => {
  const vmin = Math.min(window.innerWidth, window.innerHeight);
  const dialogRef = useRef();

  const sizeMap = {
    small: { width: "40vmin", height: "25vmin" },
    medium: { width: "60vmin", height: "40vmin" },
    large: { width: "80vmin", height: "60vmin" },
    extraLarge: { width: "120vmin", height: "60vmin" },
    xl: { width: "170vmin", height: "60vmin" },
    xxl: { width: "190vmin", height: "60vmin" },
  };

  const Width = modalWidth || sizeMap[size].width;
  const Height = modalHeight || sizeMap[size].height;

  return (
    <Dialog
      open={open}
      onClose={(event, reason) => {
        if (reason === "backdropClick") return;
        onHide(event, reason);
      }}
      aria-labelledby={`${id}-modal-title`}
      aria-describedby={`${id}-modal-description`}
      disableEnforceFocus
      disableAutoFocus
      disableRestoreFocus
      fullWidth={false}
      maxWidth={false}
      maxHeight={maxHeight}
      transitionDuration={0}
      keepMounted={false}
      PaperComponent={PaperComponent}
      PaperProps={{
        style: {
          overflow: "hidden",
          margin: "0",
          width: "auto",
          maxWidth: "none",
        },
      }}
    >
      <Resizable
        defaultSize={{ width: Width, height: Height }}
        minWidth={(32 * vmin) / 100}
        minHeight={(32 * vmin) / 100}
        enable={{
          bottom: true,
          bottomLeft: true,
          bottomRight: true,
          left: true,
          right: true,
        }}
        handleStyles={{
          left: { cursor: "ew-resize" },
          bottom: { cursor: "ns-resize" },
          right: { cursor: "ew-resize" },
        }}
      >
        <div className="flex flex-col h-full">
          {/* HEADER */}
          <div
            className="
              h-[4.8vmin] bg-primary_blue_bg rounded-t-[1vmin]
              flex justify-between items-center 
              px-[1.5vmin] py-[2vmin] cursor-move
            "
          >
            <DialogTitle
              className="
                font-sabic_text_bold text-14 
                text-primary_gray uppercase mt-[0.3vmin]
              "
              id="draggable-dialog-title"
            >
              {title}
            </DialogTitle>

            <div className="flex gap-[1.2vmin]">
              {/* DOWNLOAD BUTTON */}
              {getValsBaseOnCondition(
                CompareValuesWithSymbol(
                  "&&",
                  downloadConfig,
                  downloadConfig.isVisible
                ),
                <Tooltip
                  placement="top-start"
                  arrow
                  title={downloadConfig?.toolTipMsg}
                  slotProps={{
                    popper: { disablePortal: true },
                    tooltip: { className: "customTooltip" },
                  }}
                >
                  <IconButton
                    aria-label="download"
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = downloadConfig?.path;
                      link.download = downloadConfig?.fileName;
                      link.click();
                    }}
                    className="hover:!bg-transparent flex items-center h-[4.6vmin]"
                    sx={{
                      top: 1.5,
                      padding: 0,
                    }}
                  >
                    <DownloadIcon sx={{ fontSize: "2.4vmin", color: "inherit" }} />
                  </IconButton>
                </Tooltip>,

                null
              )}

              {/* SCREENSHOT BUTTON */}
              <IconButton
                aria-label="camera"
                onClick={() => {
                  const credits = getUserInfoAndTime(timezone);
                  const filename = getFileNameFromUrl(title, "png");

                  capturePngWithHeader(
                    `[data-tut="${dialogRef?.current?.dataset?.tut}"]`,
                    filename,
                    credits,
                    title
                  );
                }}
                className="hover:!bg-transparent h-[4.6vmin]"
                sx={{
                  top: 1.5,
                  padding: 0,
                }}
              >
                <CameraAltIcon sx={{ fontSize: "2.4vmin", color: "inherit" }} />
              </IconButton>

              {/* CLOSE BUTTON */}
              <IconButton
                data-testid="close-modal"
                aria-label="close"
                onClick={onHide}
                className="hover:!bg-transparent closeIcon h-[4.6vmin]"
                sx={{
                  top: 1.5,
                  padding: 0,
                }}
              >
                <CloseIcon sx={{ fontSize: "2.4vmin", color: "inherit" }} />
              </IconButton>
            </div>
          </div>

          {/* CONTENT */}
          <DialogContent
            ref={dialogRef}
            id={id}
            className="!py-[1.6vmin] !px-[2.5vmin]"
          >
            {children}
          </DialogContent>

          {/* ACTIONS */}
          {modalActions && (
            <DialogActions className="!justify-start">
              {modalActions}
            </DialogActions>
          )}
        </div>
      </Resizable>
    </Dialog>
  );
};

export default memo(CustomModal);



