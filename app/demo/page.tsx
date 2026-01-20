"use client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import useMeasure from "react-use-measure";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { ComponentProps, ReactNode } from "react";

export default function DemoPage() {
  return (
    <Hero>
      <p>Loader</p>
      <p>Gallery</p>
      <p>Art Info</p>

      <PBT />
    </Hero>
  );
}

function PBT() {
  const [view, setView] = useState("default");

  const content = useMemo(() => {
    switch (view) {
      case "default":
        return (
          <Button
            onClick={() => setView("art")}
            className="h-12 bg-transparent px-2 font-black uppercase after:text-white/50 after:content-['//'] hover:bg-transparent"
          >
            <Avatar>
              <AvatarImage src="/yuka.png" alt="Yuka" width={24} height={24} />
            </Avatar>
            Yuka
          </Button>
        );
      case "art":
        return (
          <div className="flex w-80 flex-col gap-4 py-4 text-white">
            <div className="px-8">
              <p className="text-4xl leading-none font-black text-balance uppercase">
                The Great Sake Wave
              </p>
              <Separator className="my-3" />
              <p className="text-sm font-light">
                Artwork owners can claim or transfer by pressing the button
                below.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-6">
              <Button
                onClick={() => setView("address")}
                className="h-12 flex-1 rounded-full bg-[#c03540] font-black uppercase hover:bg-[#c03540]/80"
              >
                <PBTIcon /> PBT
              </Button>
            </div>
          </div>
        );
      case "address":
        return (
          <div className="flex w-80 flex-col gap-5 py-4 text-white">
            <div className="space-y-4 px-8">
              <p className="leading-tighter text-3xl font-black uppercase">
                Destination Address?
              </p>
              <Separator className="my-3" />
              <p className="text-sm font-light">
                Where are we sending the PBT?
              </p>
              <Input className="rounded-none" />
            </div>

            <div className="flex justify-end gap-2 px-6">
              <Button
                onClick={() => setView("default")}
                size="icon"
                className="size-12 rounded-full border border-white/20 bg-transparent font-black uppercase hover:bg-white/20"
              >
                <ChevronLeft />
              </Button>
              <Button
                onClick={() => setView("scan")}
                className="h-12 flex-1 rounded-full bg-[#c03540] font-black uppercase hover:bg-[#c03540]/80"
              >
                Confirm
              </Button>
            </div>
          </div>
        );
      case "scan":
        return (
          <div className="flex w-80 flex-col gap-4 py-4 text-white">
            <div className="px-8">
              <p className="text-3xl leading-tight font-black uppercase">
                <PBTIcon className="mr-2 inline size-10 -translate-y-1" /> Scan
                PBT
              </p>
              <Separator className="my-3" />
              <p className="text-sm font-light">
                Place your phone over the PBT on the provided card.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-6">
              <Button
                onClick={() => setView("default")}
                size="icon"
                className="size-12 rounded-full border border-white/20 bg-transparent font-black uppercase hover:bg-white/20"
              >
                <ChevronLeft />
              </Button>
              <Button
                onClick={() => setView("pending")}
                className="h-12 flex-1 rounded-full bg-[#c03540] font-black uppercase hover:bg-[#c03540]/80"
              >
                Send
              </Button>
            </div>
          </div>
        );
      case "pending":
        return (
          <div className="flex w-80 flex-col gap-4 py-4 text-white">
            <div className="px-8">
              <div className="flex items-center gap-2">
                <p className="leading-tighter text-2xl font-black uppercase">
                  Submitting transaction
                </p>
                <Loader2 className="size-full animate-spin p-1.5" />
              </div>
              <Separator className="my-3" />
              <p className="text-sm font-light">
                Please wait while we submit your transaction.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-6">
              <Button
                onClick={() => setView("default")}
                size="icon"
                className="size-12 rounded-full border border-white/20 bg-transparent font-black uppercase hover:bg-white/20"
              >
                <ChevronLeft />
              </Button>
              <Button
                onClick={() => setView("error")}
                className="h-12 flex-1 rounded-full bg-[#c03540] font-black uppercase hover:bg-[#c03540]/80"
              >
                Error
              </Button>
              <Button
                onClick={() => setView("success")}
                className="h-12 flex-1 rounded-full bg-[#c03540] font-black uppercase hover:bg-[#c03540]/80"
              >
                Success
              </Button>
            </div>
          </div>
        );
      case "error":
        return (
          <div className="flex w-80 flex-col gap-4 py-4 text-white">
            <div className="px-8">
              <div className="flex items-center justify-between gap-2">
                <p className="text-3xl leading-tight font-black uppercase">
                  Oh Fuck!
                </p>
                <p className="bg-white px-2 py-1 text-center text-3xl font-black text-black">
                  500
                </p>
              </div>
              <Separator className="my-3" />
              <p className="text-sm font-light">
                Something went wrong. Your transaction could not be submitted.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-6">
              <Button
                onClick={() => setView("default")}
                className="h-12 flex-1 rounded-full bg-[#c03540] font-black uppercase hover:bg-[#c03540]/80"
              >
                Contact Intern
              </Button>
            </div>
          </div>
        );
      case "success":
        return (
          <div className="flex w-80 flex-col gap-4 py-4 text-white">
            <div className="px-8">
              <p className="leading-tighter text-3xl font-black uppercase">
                Transaction Successful
              </p>
              <Separator className="my-3" />
              <p className="text-sm font-light">
                Your transfer has been confirmed.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-6">
              <Button
                onClick={() => setView("default")}
                className="h-12 flex-1 rounded-full bg-[#c03540] font-black uppercase hover:bg-[#c03540]/80"
              >
                IKUZO
              </Button>
            </div>
          </div>
        );
    }
  }, [view]);

  return (
    <div className="fixed bottom-4 left-4 z-10 max-w-80 overflow-hidden rounded-4xl bg-black outline-hidden">
      <AnimateHeight>
        <AnimatePresence initial={false} mode="popLayout" custom={view}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            key={view}
          >
            {content}
          </motion.div>
        </AnimatePresence>
      </AnimateHeight>
    </div>
  );
}

export function Container({
  children,
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-2xl px-6 md:max-w-3xl lg:max-w-7xl lg:px-10",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Hero({
  children,
  className,
  ...props
}: {
  children: ReactNode;
} & ComponentProps<"section">) {
  return (
    <section className={cn("py-16", className)} {...props}>
      <Container className="flex flex-col gap-16">{children}</Container>
    </section>
  );
}

function AnimateHeight({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const [ref, bounds] = useMeasure();
  return (
    <motion.div animate={{ height: bounds.height }}>
      <div ref={ref} className={className}>
        {children}
      </div>
    </motion.div>
  );
}

function PBTIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("size-6", className)} viewBox="0 0 36 24">
      <path
        d="M11.253,22.5 C11.517,22.5 11.798,22.219 11.798,21.946 C11.798,21.708 11.73,21.639 10.921,21.043 C9.642,20.097 8.347,18.503 7.674,17.038 C6.327,14.106 6.387,10.468 7.836,7.587 C8.67144876,5.96155163 9.9056125,4.5746227 11.423,3.556 C14.662,1.4 19.102,0.87 23.04,2.184 C25.136,2.883 26.594,3.794 28.247,5.456 C30.198,7.399 31.417,9.53 31.621,11.328 C31.69,11.933 31.861,12.188 32.21,12.188 C32.329,12.188 32.508,12.103 32.602,12.01 C32.763,11.848 32.78,11.762 32.729,11.302 C32.508,9.146 30.897,6.325 28.733,4.306 C27.717406,3.345159 26.5623467,2.54342778 25.307,1.928 C23.594,1.076 21.872,0.59 20.142,0.471 C19.75,0.445 19.273,0.411 19.086,0.394 L19.023,0.393 L18.835,0.393 C18.535,0.396 18.053,0.412 17.595,0.437 C14.288,0.616 11.356,1.843 9.149,3.982 C7.368,5.712 6.226,7.868 5.791,10.356 C5.587,11.481 5.587,13.552 5.783,14.66 C6.098,16.398 6.891,18.24 7.922,19.611 C8.893,20.907 10.734,22.501 11.254,22.501 L11.253,22.5 Z M4.342,16.62 C4.495,16.45 4.495,16.415 4.35,15.657 C4.24867326,15.0241742 4.17493682,14.3872382 4.129,13.748 C3.933,10.672 4.666,7.894 6.353,5.371 C6.881,4.578 8.398,2.959 9.276,2.243 C9.506,2.056 9.659,1.886 9.616,1.851 C9.574,1.826 9.259,1.911 8.918,2.047 C6.234,3.13 4.069,6.112 3.277,9.845 C2.859,11.788 2.995,15.776 3.498,16.603 C3.66,16.85 4.12,16.859 4.342,16.62 L4.342,16.62 Z M12.404,5.865 C14.372,4.451 16.664,3.752 18.948,3.863 C19.536,3.897 20.269,3.982 20.576,4.05 C21.573,4.289 21.718,4.297 21.863,4.118 C22.306,3.615 22.042,3.241 21.113,3.045 C19.715,2.746 18.625,2.687 17.261,2.823 C15.523,3.01 13.716,3.675 12.08,4.74 C11.176,5.328 11.031,5.473 11.031,5.831 C11.031,6.487 11.526,6.496 12.404,5.865 L12.404,5.865 Z M31.254,23.011 C31.39,23.011 32.243,22.108 32.839,21.316 C34.203,19.526 35.089,17.532 35.447,15.47 C35.609,14.49 35.609,12.572 35.447,11.464 C34.978,8.371 33.572,5.797 31.527,4.28 C30.802,3.752 30.035,3.368 30.035,3.547 C30.035,3.573 30.368,3.957 30.785,4.391 C32.609,6.317 33.828,8.601 34.356,11.081 C34.595,12.189 34.569,14.728 34.305,15.938 C33.87,17.966 32.839,20.421 31.663,22.228 C31.382,22.654 31.194,23.011 31.254,23.011 L31.254,23.011 Z M28.944,19.194 C29.115,19.006 29.481,17.89 29.686,16.918 C30.444,13.441 29.865,10.228 28.007,7.587 C27.496,6.854 26.217,5.55 25.477,4.996 C24.13,3.99 23.499,3.735 23.192,4.076 C23.022,4.263 23.005,4.646 23.158,4.774 C23.209,4.826 23.678,5.132 24.189,5.464 C25.817,6.53 27.274,8.174 28.033,9.819 C29.133,12.206 29.2,15.146 28.237,18.06 C28.135,18.358 28.058,18.69 28.058,18.81 C28.058,19.262 28.655,19.526 28.945,19.194 L28.944,19.194 Z M21.871,21.827 L22.604,21.477 C23.67,20.967 24.385,20.463 25.101,19.713 C26.686,18.052 27.419,16.1 27.419,13.553 C27.419,12.487 27.394,12.197 27.198,11.49 C26.311,8.166 24.018,6.027 20.636,5.362 C19.639,5.166 17.73,5.149 16.724,5.337 C14.338,5.763 12.404,7.195 11.372,9.3 C11.057,9.939 11.066,10.254 11.415,10.416 C11.807,10.595 12.02,10.442 12.352,9.794 C13.282,7.936 14.798,6.828 17.031,6.394 C17.755,6.249 19.494,6.274 20.363,6.436 C21.863,6.717 23.141,7.323 24.138,8.226 C25.042,9.052 25.638,9.998 26.081,11.336 C26.303,12.01 26.32,12.154 26.32,13.424 C26.32,14.634 26.294,14.882 26.098,15.614 C25.451,17.958 24.096,19.704 22.238,20.591 C21.727,20.838 21.121,21.017 20.261,21.188 C19.962,21.248 20.031,21.367 20.389,21.435 C20.559,21.46 20.969,21.563 21.292,21.656 L21.872,21.826 L21.871,21.827 Z M12.335,19.705 C12.642,19.364 12.531,19.117 11.705,18.341 C10.068,16.799 9.37,15.316 9.267,13.169 C9.199,11.609 9.557,9.888 10.273,8.362 C10.725,7.399 10.699,7.075 10.163,6.939 C9.966,6.896 9.881,6.931 9.685,7.144 C9.549,7.288 9.276,7.817 9.08,8.311 C7.716,11.737 7.861,15.001 9.489,17.481 C10.017,18.273 10.478,18.801 11.176,19.39 C11.764,19.892 12.088,19.978 12.336,19.705 L12.335,19.705 Z M5.262,23.267 L4.793,22.773 C3.183,21.085 2.075,18.827 1.657,16.398 C1.248,14.029 1.555,10.723 2.416,8.251 C2.51,7.979 2.552,7.741 2.51,7.715 C2.475,7.689 2.305,7.825 2.143,8.021 C1.487,8.78 0.856,10.331 0.583,11.848 C0.405,12.828 0.379,15.188 0.533,16.338 C0.831,18.614 1.683,20.583 2.978,21.972 C3.481,22.526 3.967,22.824 4.802,23.105 L5.262,23.267 L5.262,23.267 Z M15.846,21.034 L16.741,21 C17.841,20.95 17.764,20.958 18.94,20.634 C20.49,20.208 21.658,19.543 22.587,18.572 C23.959,17.122 24.607,15.478 24.615,13.424 C24.624,11.669 24.215,10.621 23.09,9.504 C21.923,8.328 20.687,7.834 18.923,7.851 C18.403,7.851 17.73,7.911 17.423,7.979 C15.429,8.405 13.563,10.16 13.119,12.027 C12.676,13.919 13.324,15.708 14.704,16.407 C15.727,16.927 17.074,16.799 18.045,16.075 C18.693,15.597 19.298,14.242 19.298,13.254 C19.298,12.666 19.153,12.444 18.769,12.444 C18.471,12.444 18.301,12.674 18.233,13.169 C18.147,13.842 17.866,14.6 17.593,14.933 C16.835,15.844 15.378,15.862 14.628,14.958 C13.903,14.072 13.928,12.342 14.696,11.132 C15.719,9.522 17.917,8.609 19.843,8.984 C22.433,9.496 23.908,11.644 23.482,14.276 C23.039,17.021 21.258,18.921 18.531,19.594 C17.645,19.816 16.724,20.259 16.221,20.702 L15.846,21.034 L15.846,21.034 Z M13.469,21.852 C13.869,21.673 14.057,21.546 14.116,21.392 C14.466,20.463 15.062,19.79 15.957,19.322 C16.272,19.151 16.98,18.844 17.534,18.632 C20.124,17.626 21.036,16.833 21.65,15.043 C21.8545116,14.4827669 21.9640181,13.8923107 21.974,13.296 C21.979,12.696 21.88,12.206 21.658,11.754 C21.028,10.459 19.418,9.777 17.951,10.186 C17.329,10.365 17.031,10.526 16.621,10.944 C16,11.558 15.633,12.589 15.633,13.68 C15.633,14.183 15.813,14.421 16.187,14.421 C16.571,14.421 16.741,14.183 16.741,13.654 C16.741,12.854 16.971,12.206 17.423,11.754 C18.454,10.723 20.286,11.106 20.738,12.436 C20.883,12.879 20.848,13.782 20.67,14.43 C20.218,15.99 19.545,16.646 17.55,17.43 C15.94,18.06 15.37,18.324 14.858,18.674 C13.895,19.321 13.23,20.31 12.958,21.477 C12.881,21.776 12.847,22.04 12.864,22.057 C12.881,22.083 13.154,21.989 13.469,21.852 L13.469,21.852 Z M13.111,17.983 C13.341,17.983 13.451,17.933 13.554,17.77 C13.75,17.464 13.656,17.217 13.162,16.799 C12.582,16.305 11.994,15.452 11.73,14.719 C11.543,14.183 11.517,13.979 11.517,13.058 C11.526,12.086 11.517,12.01 11.347,11.89 C11.091,11.711 10.827,11.728 10.639,11.941 C10.409,12.197 10.359,13.876 10.563,14.66 C10.835,15.725 11.398,16.637 12.293,17.498 C12.719,17.898 12.855,17.983 13.111,17.983 L13.111,17.983 Z M28.629,23.608 L29.311,22.901 C31.297,20.864 32.575,17.761 32.737,14.609 C32.788,13.595 32.788,13.578 32.583,13.441 C32.328,13.254 32.14,13.262 31.919,13.441 C31.774,13.569 31.731,13.748 31.655,14.549 C31.433,16.952 30.768,18.972 29.626,20.728 C29.115,21.503 28.152,22.543 27.419,23.097 L26.891,23.497 L27.283,23.557 C27.496,23.582 27.888,23.608 28.153,23.608 L28.629,23.608 L28.629,23.608 Z M7.938,23.438 L8.611,23.344 C8.978,23.293 9.336,23.224 9.395,23.19 C9.463,23.148 9.293,22.986 8.884,22.713 C7.512,21.784 5.722,19.73 5.271,18.58 C5.20330295,18.3900773 5.11155633,18.2096087 4.998,18.043 C4.81,17.83 4.342,17.856 4.18,18.086 C4,18.341 4.01,18.444 4.29,19.108 C4.819,20.336 6.055,21.895 7.359,22.96 L7.938,23.438 L7.938,23.438 Z M25.502,23.011 C25.792,23.011 27.155,21.921 27.658,21.281 C28.024,20.821 28.075,20.541 27.82,20.284 C27.513,19.978 27.274,20.063 26.652,20.719 C26.005,21.401 25.289,21.938 24.564,22.296 L24.07,22.534 L24.726,22.773 C25.084,22.901 25.434,23.011 25.502,23.011 L25.502,23.011 Z"
        fill="#FFFFFF"
      ></path>
    </svg>
  );
}
