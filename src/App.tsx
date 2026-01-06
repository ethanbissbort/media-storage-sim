import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
} from "solid-js";

import "flowbite";
import { qualityProfiles, QualityProfile } from "./qualityProfiles";

import {
  CategoryScale,
  Chart,
  ChartConfiguration,
  ChartData,
  Colors,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";

Chart.register(
  Title,
  Tooltip,
  Legend,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Colors
);

// Constants - avoid magic numbers
const TB_TO_MB = 1_000_000;
const AVERAGE_EPISODE_LENGTH = 24; // minutes
const AVERAGE_EPISODES_PER_SEASON = 25;
const AVERAGE_SEASONS = 8;
const AVERAGE_MOVIE_LENGTH = 90; // minutes (60 * 1.5)
const RATIO_STEPS = 21; // 0, 5, 10, ..., 100

// Pre-computed ratio values to avoid recreation on each render
const RATIOS = Object.freeze(
  Array.from({ length: RATIO_STEPS }, (_, i) => i * 5)
);

/**
 * Calculate average bitrate from selected quality profiles
 * @param profiles - Array of selected quality profile keys
 * @returns Average MB/min across all selected profiles
 */
const calculateAverageSize = (profiles: readonly QualityProfile[]): number => {
  if (profiles.length === 0) return 0;

  let totalSize = 0;
  for (const profile of profiles) {
    const sizes = qualityProfiles[profile];
    totalSize += (sizes[0] + sizes[1]) / 2;
  }
  return totalSize;
};

/**
 * Safe division that returns 0 when denominator is 0
 * Prevents Infinity/NaN in calculations
 */
const safeDivide = (numerator: number, denominator: number): number => {
  if (denominator === 0 || !Number.isFinite(denominator)) return 0;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : 0;
};

/**
 * Create a checkbox change handler for quality profile selection
 */
const createProfileHandler = (
  currentProfiles: () => QualityProfile[],
  setProfiles: (profiles: QualityProfile[]) => void
) => {
  return (qualityProfile: QualityProfile, checked: boolean) => {
    if (checked) {
      setProfiles([...currentProfiles(), qualityProfile]);
    } else {
      setProfiles(currentProfiles().filter((p) => p !== qualityProfile));
    }
  };
};

/**
 * Format number for display using browser locale
 */
const formatNumber = (value: number, maxFractionDigits: number): string => {
  return new Intl.NumberFormat(navigator.language, {
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
};

const App: Component = () => {
  // State signals
  const [showProfiles, setShowProfiles] = createSignal<QualityProfile[]>([]);
  const [movieProfiles, setMovieProfiles] = createSignal<QualityProfile[]>([]);
  const [availableStorage, setAvailableStorage] = createSignal(0);
  const [ratio, setRatio] = createSignal(50);

  // Memoized calculations - only recompute when dependencies change
  const averageShowSize = createMemo(() =>
    calculateAverageSize(showProfiles())
  );

  const averageMovieSize = createMemo(() =>
    calculateAverageSize(movieProfiles())
  );

  const averageEpisodeSize = createMemo(
    () => averageShowSize() * AVERAGE_EPISODE_LENGTH
  );

  const showStorage = createMemo(() => {
    const storageInMB = availableStorage() * TB_TO_MB;
    return movieProfiles().length > 0
      ? storageInMB * ((100 - ratio()) / 100)
      : storageInMB;
  });

  const movieStorage = createMemo(() => {
    const storageInMB = availableStorage() * TB_TO_MB;
    return showProfiles().length > 0
      ? storageInMB * (ratio() / 100)
      : storageInMB;
  });

  const shows = createMemo(() =>
    safeDivide(
      showStorage(),
      averageEpisodeSize() * AVERAGE_EPISODES_PER_SEASON * AVERAGE_SEASONS
    )
  );

  const movies = createMemo(() =>
    safeDivide(movieStorage(), averageMovieSize() * AVERAGE_MOVIE_LENGTH)
  );

  // Pre-create handlers to avoid recreation on each render
  const handleShowProfileChange = createProfileHandler(
    showProfiles,
    setShowProfiles
  );
  const handleMovieProfileChange = createProfileHandler(
    movieProfiles,
    setMovieProfiles
  );

  // Chart management with proper cleanup
  let chartCanvas: HTMLCanvasElement | undefined;
  let chart: Chart | undefined;

  onMount(() => {
    if (!chartCanvas) return;

    const data: ChartData<"line"> = {
      labels: [...RATIOS],
      datasets: [],
    };

    const config: ChartConfiguration<"line"> = {
      type: "line",
      data,
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: {
          duration: 150, // Reduced animation for better performance
        },
        scales: {
          x: {
            ticks: {
              color: "white",
              callback: (_, index) => `${index * 5}%`,
            },
          },
          y: {
            ticks: {
              color: "white",
            },
            beginAtZero: true,
          },
        },
        plugins: {
          colors: {
            enabled: true,
          },
          title: { color: "white" },
          legend: {
            labels: {
              color: "white",
            },
          },
        },
      },
    };

    chart = new Chart(chartCanvas, config);
  });

  // Cleanup chart on component unmount to prevent memory leaks
  onCleanup(() => {
    if (chart) {
      chart.destroy();
      chart = undefined;
    }
  });

  // Update chart data when dependencies change
  createEffect(() => {
    if (!chart) return;

    const storageInMB = availableStorage() * TB_TO_MB;
    const avgEpisodeSize = averageEpisodeSize();
    const avgMovieSize = averageMovieSize();
    const episodeDivisor =
      avgEpisodeSize * AVERAGE_EPISODES_PER_SEASON * AVERAGE_SEASONS;
    const movieDivisor = avgMovieSize * AVERAGE_MOVIE_LENGTH;

    chart.data.datasets = [
      {
        label: "Shows",
        data: RATIOS.map((r) => {
          const storage = storageInMB * ((100 - r) / 100);
          return safeDivide(storage, episodeDivisor);
        }),
        tension: 0.1,
      },
      {
        label: "Movies",
        data: RATIOS.map((r) => {
          const storage = storageInMB * (r / 100);
          return safeDivide(storage, movieDivisor);
        }),
        tension: 0.1,
      },
    ];

    chart.update("none"); // Use 'none' mode for faster updates
  });

  return (
    <main
      class="p-8 min-h-screen dark:bg-slate-600 flex gap-6 flex-wrap md:flex-nowrap"
      role="main"
    >
      <div class="flex-1 md:min-w-[450px]">
        <h1 class="text-5xl mb-12 text-white font-head">Media Hoarder</h1>

        <div class="flex flex-col gap-4 mb-8 md:mb-8 lg:mb-16">
          {/* Series Quality Selection */}
          <fieldset class="flex flex-col gap-2">
            <legend class="dark:text-gray-200 text-xl mb-2">
              Series Quality
            </legend>
            <ul
              class="items-center w-full text-sm font-medium flex flex-col md:flex-row"
              role="group"
              aria-label="Series quality profile selection"
            >
              <For each={Object.keys(qualityProfiles) as QualityProfile[]}>
                {(qualityProfile) => (
                  <li class="w-full">
                    <div class="flex items-center">
                      <input
                        id={`shows-${qualityProfile}-option`}
                        type="checkbox"
                        value={qualityProfile}
                        class="hidden peer"
                        aria-describedby={`shows-${qualityProfile}-label`}
                        onInput={(e) =>
                          handleShowProfileChange(
                            qualityProfile,
                            e.currentTarget.checked
                          )
                        }
                      />
                      <label
                        id={`shows-${qualityProfile}-label`}
                        for={`shows-${qualityProfile}-option`}
                        class="inline-flex items-center justify-between w-full p-2 md:p-5 text-gray-500 bg-white border-2 border-gray-200 rounded-lg cursor-pointer dark:hover:text-gray-300 dark:border-gray-700 peer-checked:border-blue-600 hover:text-gray-600 dark:peer-checked:text-gray-300 peer-checked:text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:bg-gray-800 dark:hover:bg-gray-700"
                      >
                        <span class="w-full text-lg font-semibold">
                          {qualityProfile}
                        </span>
                      </label>
                    </div>
                  </li>
                )}
              </For>
            </ul>
            <p class="dark:text-gray-300" aria-live="polite">
              Average size: {averageShowSize()}MB/Min.
            </p>
          </fieldset>

          {/* Movie Quality Selection */}
          <fieldset class="flex flex-col gap-2">
            <legend class="dark:text-gray-200 text-xl mb-2">Movie Quality</legend>
            <ul
              class="items-center w-full text-sm font-medium flex flex-col md:flex-row"
              role="group"
              aria-label="Movie quality profile selection"
            >
              <For each={Object.keys(qualityProfiles) as QualityProfile[]}>
                {(qualityProfile) => (
                  <li class="w-full">
                    <div class="flex items-center">
                      <input
                        id={`movies-${qualityProfile}-option`}
                        type="checkbox"
                        value={qualityProfile}
                        class="hidden peer"
                        aria-describedby={`movies-${qualityProfile}-label`}
                        onInput={(e) =>
                          handleMovieProfileChange(
                            qualityProfile,
                            e.currentTarget.checked
                          )
                        }
                      />
                      <label
                        id={`movies-${qualityProfile}-label`}
                        for={`movies-${qualityProfile}-option`}
                        class="inline-flex items-center justify-between w-full p-2 md:p-5 text-gray-500 bg-white border-2 border-gray-200 rounded-lg cursor-pointer dark:hover:text-gray-300 dark:border-gray-700 peer-checked:border-blue-600 hover:text-gray-600 dark:peer-checked:text-gray-300 peer-checked:text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:bg-gray-800 dark:hover:bg-gray-700"
                      >
                        <span class="w-full text-lg font-semibold">
                          {qualityProfile}
                        </span>
                      </label>
                    </div>
                  </li>
                )}
              </For>
            </ul>
            <p class="dark:text-gray-300" aria-live="polite">
              Average size: {(averageMovieSize() * 60) / 1000}GB/h
            </p>
          </fieldset>

          {/* Storage Input */}
          <div class="flex flex-col gap-2">
            <label for="storage" class="block dark:text-gray-200 text-xl">
              Available storage (TB)
            </label>
            <input
              type="number"
              id="storage"
              min={0}
              step={0.1}
              class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              placeholder="Enter storage in TB"
              aria-describedby="storage-help"
              onInput={(e) => {
                const value = e.currentTarget.valueAsNumber;
                setAvailableStorage(Number.isNaN(value) ? 0 : Math.max(0, value));
              }}
              value={availableStorage()}
              required
            />
            <span id="storage-help" class="sr-only">
              Enter your total available storage in terabytes
            </span>
          </div>

          {/* Ratio Slider */}
          <div class="flex flex-col gap-2">
            <label
              for="ratio"
              class="block font-medium text-xl text-gray-900 dark:text-gray-200"
            >
              Storage Allocation Ratio
            </label>
            <div class="flex gap-4 items-center">
              <p class="dark:text-gray-200" aria-hidden="true">
                Shows
                <br />
                <span class="text-gray-300">{100 - ratio()}%</span>
              </p>
              <input
                id="ratio"
                type="range"
                min={0}
                max={100}
                value={ratio()}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={ratio()}
                aria-valuetext={`${100 - ratio()}% for shows, ${ratio()}% for movies`}
                class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-800"
                onInput={(e) => setRatio(e.currentTarget.valueAsNumber)}
              />
              <p class="dark:text-gray-200" aria-hidden="true">
                Movies
                <br />
                <span class="text-gray-300">{ratio()}%</span>
              </p>
            </div>
          </div>
        </div>

        {/* Results Cards */}
        <div
          class="flex flex-col items-center justify-center md:flex-row md:items-stretch gap-4 md:gap-8 lg:gap-12"
          role="region"
          aria-label="Calculation results"
        >
          {showProfiles().length > 0 && (
            <article class="flex-1 max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 flex flex-col">
              <h2 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                {formatNumber(shows(), 0)} Shows
              </h2>
              <p class="font-normal text-gray-700 dark:text-gray-400 mb-2">
                Assuming an average show has {AVERAGE_SEASONS} seasons, with{" "}
                {AVERAGE_EPISODES_PER_SEASON} episodes and each episode has a
                runtime of {AVERAGE_EPISODE_LENGTH} minutes.
              </p>
              <p class="font-normal text-gray-800 dark:text-gray-300 mt-auto">
                {formatNumber(showStorage() / TB_TO_MB, 2)} TB available to Shows
              </p>
            </article>
          )}
          {movieProfiles().length > 0 && (
            <article class="flex-1 max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 flex flex-col">
              <h2 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                {formatNumber(movies(), 0)} Movies
              </h2>
              <p class="font-normal text-gray-700 dark:text-gray-400 mb-2">
                Assuming an average movie runs for {AVERAGE_MOVIE_LENGTH} minutes.
              </p>
              <p class="font-normal text-gray-800 dark:text-gray-300 mt-auto">
                {formatNumber(movieStorage() / TB_TO_MB, 2)} TB available to Movies
              </p>
            </article>
          )}
        </div>
      </div>

      {/* Chart Section */}
      <div class="md:mt-16 w-full max-w-[900px]">
        <canvas
          ref={chartCanvas}
          role="img"
          aria-label="Line chart showing the relationship between storage allocation ratio and number of shows/movies that can be stored"
        />
      </div>
    </main>
  );
};

export default App;
