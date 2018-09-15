#ifndef VIGEMTESTER_H
#define VIGEMTESTER_H

#define WIN32_LEAN_AND_MEAN
#include <Windows.h>
//#include <ViGEm\ViGEmClient.h>
#include "ViGEm/ViGEmClient.h"
#include <cstdio>
#include <stdlib.h>





void initController();
void updateVirtualController(int buttons, int LX, int LY, int RX, int RY);




VIGEM_API PVIGEM_CLIENT driver;
VIGEM_API VIGEM_ERROR ret;
VIGEM_API PVIGEM_TARGET x360;

//PVIGEM_CLIENT driver;
//VIGEM_ERROR ret;
//PVIGEM_TARGET x360;



class XBoxController {

public:

	int buttons = 0;

	struct btn_states {

		// left:
		int up = 0;
		int down = 0;
		int left = 0;
		int right = 0;
		int lb = 0;
		int lt = 0;
		int select = 0;

		// right:
		int a = 0;
		int b = 0;
		int x = 0;
		int y = 0;
		int rb = 0;
		int rt = 0;
		int start = 0;
		int xbox = 0;

		int stick_button1 = 0;
		int stick_button2 = 0;

	} btns;

	XUSB_REPORT report;
	VIGEM_API PVIGEM_CLIENT driver;
	VIGEM_API VIGEM_ERROR ret;
	VIGEM_API PVIGEM_TARGET x360;

	XBoxController(PVIGEM_CLIENT driver/*, VIGEM_ERROR ret*/) {

		this->driver = driver;
//		this->ret = ret;
//		this->ret = this->vigem_connect(this->driver);

		//
		// Allocate target device object of type Xbox 360 Controller
		//
		this->x360 = vigem_target_x360_alloc();

		//
		// Add new Xbox 360 device to bus.
		//
		// This call blocks until the device reached working state
		// or an error occurred.
		//
		this->ret = vigem_target_add(driver, this->x360);
		if (!VIGEM_SUCCESS(this->ret)) {
			printf("Couldn't add virtual X360 device");
			return;
		}

		XUSB_REPORT_INIT(&this->report);
	}


	void update(int buttons=0, int LX=0, int LY=0, int RX=0, int RY=0, int LT=0, int RT=0) {

		// generate button and axis values
		this->report.wButtons = buttons;
		this->report.bLeftTrigger = LT;
		this->report.bRightTrigger = RT;
		this->report.sThumbLX = LX;
		this->report.sThumbLY = LY;
		this->report.sThumbRX = RX;
		this->report.sThumbRY = RY;

		//
		// Submit report to device
		//
		this->ret = vigem_target_x360_update(this->driver, this->x360, this->report);
		if (!VIGEM_SUCCESS(this->ret)) {
			printf("Couldn't submit report update");
			return;
		}
	}

};


#endif // VIGEMTESTER_H
