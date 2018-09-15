#ifndef VIGEMMANAGER_H
#define VIGEMMANAGER_H

#define WIN32_LEAN_AND_MEAN
#include <Windows.h>
//#include <ViGEm\ViGEmClient.h>
#include "ViGEm/ViGEmClient.h"
#include <cstdio>
#include <stdlib.h>
#include <vector>

#include "vigemController.hpp"




class ControllerManager {

public:

	std::vector<XBoxController> controllers;

	XUSB_REPORT report;
	VIGEM_API PVIGEM_CLIENT driver;
	VIGEM_API VIGEM_ERROR ret;
	VIGEM_API PVIGEM_TARGET x360;

	ControllerManager() {
		//
		// Allocate driver connection object
		//
		driver = vigem_alloc();

		//
		// Attempt to connect to bus driver
		//
		ret = vigem_connect(driver);
		if (!VIGEM_SUCCESS(ret)){
			printf("Couldn't connect to driver");
			return;
		}
	}

	void addController() {
		XBoxController controller = XBoxController(driver);
//		controller.driver = driver;
//		controller.ret = ret;
//		controller.x360 = x360;

		this->controllers.push_back(controller);
	}

};



#endif // VIGEMMANAGER_H
