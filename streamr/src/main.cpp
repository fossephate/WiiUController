


#pragma warning(disable:4996)


#include <stdio.h>
#include <fstream>
#include <stdlib.h>
#include <iostream>

#include <mutex>

#include <filesystem>

#include <string>

#include <chrono>
#include <thread>

#include <vector>

#include <algorithm>
#include "screen.h"
#include "base64.h"
#include "MouseController.hpp"
#include "KeyboardController.hpp"

#include <gdiplus.h>
#pragma comment(lib, "Gdiplus.lib")

#include "tools.h"


//#pragma comment(linker, "/SUBSYSTEM:windows /ENTRY:mainCRTStartup")

namespace fs = std::experimental::filesystem;

#if defined(_WIN32)
	#include <Windows.h>
	#include <Lmcons.h>
	#include <shlobj.h>
#endif

#include "sio/sio_client.h"


std::mutex _lock;




int main(int argc, char *argv[]) {

mainstart:

	// hide console window
	HWND hWnd = GetConsoleWindow();
	//ShowWindow(hWnd, SW_HIDE);
	SetWindowText(hWnd, "streamr");

	// Initialize GDI+.
	ULONG_PTR m_gdiplusToken;
	Gdiplus::GdiplusStartupInput gdiplusStartupInput;
	Gdiplus::GdiplusStartup(&m_gdiplusToken, &gdiplusStartupInput, NULL);


	char user_name[UNLEN + 1];
	DWORD user_name_size = sizeof(user_name);
	GetUserName(user_name, &user_name_size);
	printf("username: %s\n", user_name);
	std::string name(user_name);


	sio::client myClient;
	// set infinite reconnect attempts
	myClient.set_reconnect_attempts(999999999999);

	//myClient.connect("http://fosse.co:443/socket.io");
	//myClient.connect("http://fosse.co:80/socket.io");
	//myClient.connect("http://fosse.co:80/socket.io"); // what it was
	//myClient.connect("https://fosse.co:80/socket.io"); // works // best
	//myClient.connect("https://fosse.co:80/8100/socket.io");
	//myClient.connect("http://fosse.co/8110");// works

	myClient.connect("https://159.65.235.95:80/socket.io"); // use the ip address instead of the domain name


	// emit text
	myClient.socket()->emit("registerName", name);

	myClient.socket()->on("registerNames", sio::socket::event_listener_aux([&](std::string const& name, sio::message::ptr const& data, bool isAck, sio::message::list &ack_resp) {
		char user_name[UNLEN + 1];
		DWORD user_name_size = sizeof(user_name);
		GetUserName(user_name, &user_name_size);

		printf("username: %s\n", user_name);
		std::string name2(user_name);
		myClient.socket()->emit("registerName", name2);
	}));

	// screenshot:
	myClient.socket()->on("ss", sio::socket::event_listener_aux([&](std::string const& name, sio::message::ptr const& data, bool isAck, sio::message::list &ack_resp) {
		
		printf("recieved ss.\n");

		RECT      rc;
		GetClientRect(GetDesktopWindow(), &rc);

		long width = rc.right;
		long height = rc.bottom;

		int q = data->get_map()["q"]->get_int();// quality

		// for high DPI displays:
		if (width == 1500) {
			width *= 2;
			height *= 2;
		}

		POINT a{ 0, 0 };
		POINT b{ width, height };

		std::string encoded_string = screenshotToBase64(a, b, q);

		myClient.socket()->emit("screenshot", encoded_string);
	}));


	// screenshot with new parameters:
	myClient.socket()->on("ss2", sio::socket::event_listener_aux([&](std::string const& name, sio::message::ptr const& data, bool isAck, sio::message::list &ack_resp) {

		printf("recieved ss.\n");

		RECT      rc;
		GetClientRect(GetDesktopWindow(), &rc);

		int x1 = data->get_map()["x1"]->get_int();
		int y1 = data->get_map()["y1"]->get_int();
		int x2 = data->get_map()["x2"]->get_int();
		int y2 = data->get_map()["y2"]->get_int();
		int q = data->get_map()["q"]->get_int();

		long width = rc.right;
		long height = rc.bottom;

		POINT a;
		POINT b;
		
		// incase I want to set the compression level but don't know the width and height:
		if (x1 == -1) {
			width = rc.right;
			height = rc.bottom;

			// for high DPI displays:
			if (width == 1500) {
				width *= 2;
				height *= 2;
			}

			a = { 0, 0 };
			b = { width, height };
		} else {
			a = { x1, y1 };
			b = { x2, y2 };
		}

		std::string encoded_string = screenshotToBase64(a, b, q);

		myClient.socket()->emit("screenshot", encoded_string);
	}));

	// screenshot with new new parameters:
	myClient.socket()->on("ss3", sio::socket::event_listener_aux([&](std::string const& name, sio::message::ptr const& data, bool isAck, sio::message::list &ack_resp) {

		printf("recieved ss.\n");

		RECT      rc;
		GetClientRect(GetDesktopWindow(), &rc);

		int x1 = data->get_map()["x1"]->get_int();
		int y1 = data->get_map()["y1"]->get_int();
		int x2 = data->get_map()["x2"]->get_int();
		int y2 = data->get_map()["y2"]->get_int();
		int q = data->get_map()["q"]->get_int();
		int s = data->get_map()["s"]->get_int();

		long width = rc.right;
		long height = rc.bottom;

		POINT a;
		POINT b;

		// incase I want to set the compression level but don't know the width and height:
		if (x1 == -1) {
			width = rc.right;
			height = rc.bottom;

			// for high DPI displays:
			if (width == 1500) {
				width *= 2;
				height *= 2;
			}

			a = { 0, 0 };
			b = { width, height };
		} else {
			a = { x1, y1 };
			b = { x2, y2 };
		}

		std::string encoded_string = screenshotToBase64Resize(a, b, q, s);

		myClient.socket()->emit("screenshot", encoded_string);
	}));

	myClient.socket()->on("restart", sio::socket::event_listener_aux([&](std::string const& name, sio::message::ptr const& data, bool isAck, sio::message::list &ack_resp) {
		printf("restarting\n");
	}));


	myClient.socket()->on("quit", sio::socket::event_listener_aux([&](std::string const& name, sio::message::ptr const& data, bool isAck, sio::message::list &ack_resp) {
		exit(0);
	}));


	// Shut Down GDI+
	//Gdiplus::GdiplusShutdown(m_gdiplusToken);


	using namespace std::chrono;

	steady_clock::time_point clock_begin = steady_clock::now();

	while (true) {

		Sleep(1000);

		steady_clock::time_point clock_end = steady_clock::now();

		steady_clock::duration time_span = clock_end - clock_begin;
		double nseconds = double(time_span.count()) * steady_clock::period::num / steady_clock::period::den;

		//std::cout << nseconds << " seconds." << std::endl;
		
		if (nseconds > 600) {
			exit(0);
		}
	}

	

	// why is this necessary??
	int x;
	std::cin >> x;

	return 0;
}