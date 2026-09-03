import { Presentation } from "../types";

declare global {
  interface Window {
    google?: any;
  }
}

let cachedAccessToken: string | null = null;
let tokenClientInstance: any = null;

export async function getGoogleAccessToken(): Promise<string> {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }

  return new Promise((resolve, reject) => {
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      reject(new Error("Google Identity Services script is loading or unavailable. Please wait a moment or refresh the page."));
      return;
    }

    const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || "";

    try {
      tokenClientInstance = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "https://www.googleapis.com/auth/presentations https://www.googleapis.com/auth/drive.file",
        callback: (response: any) => {
          if (response.error) {
            reject(new Error(`Google Authorization: ${response.error_description || response.error}`));
          } else if (response.access_token) {
            cachedAccessToken = response.access_token;
            // Expire cached token after 50 minutes
            setTimeout(() => { cachedAccessToken = null; }, 50 * 60 * 1000);
            resolve(response.access_token);
          } else {
            reject(new Error("No access token was granted. Please try again."));
          }
        },
        error_callback: (err: any) => {
          if (err.type === "popup_closed" || (err.message && err.message.toLowerCase().includes("closed"))) {
            reject(new Error("Google authorization window was closed before completing. Click again when ready, or download the .pptx file."));
          } else if (err.type === "popup_failed_to_open") {
            reject(new Error("Popups appear to be blocked by your browser. Please allow popups for this tab or download the .pptx file."));
          } else {
            reject(new Error(err.message || "Google authorization failed. Please try again or download the .pptx file."));
          }
        }
      });

      tokenClientInstance.requestAccessToken({ prompt: "" });
    } catch (e: any) {
      reject(new Error(e.message || "Failed to initialize Google authentication client."));
    }
  });
}

export async function createGoogleSlideDeck(presentation: Presentation): Promise<{ presentationId: string; presentationUrl: string }> {
  const token = await getGoogleAccessToken();

  // 1. Create a new presentation
  const createRes = await fetch("https://slides.googleapis.com/v1/presentations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: presentation.title || "Educational Presentation Deck",
    }),
  });

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    throw new Error(errData.error?.message || "Failed to create presentation in Google Slides.");
  }

  const presentationData = await createRes.json();
  const presentationId = presentationData.presentationId;
  const initialSlideId = presentationData.slides?.[0]?.objectId;

  // 2. Build BatchUpdate Requests for Slides Design
  const requests: any[] = [];
  const timestamp = Date.now();

  // Colors
  const darkNavyRgb = { red: 0.06, green: 0.09, blue: 0.16 }; // #0f172a
  const indigoRgb = { red: 0.39, green: 0.40, blue: 0.95 }; // #6366f1
  const cardBgRgb = { red: 0.12, green: 0.16, blue: 0.23 }; // #1e293b
  const whiteRgb = { red: 1.0, green: 1.0, blue: 1.0 };
  const lightIndigoRgb = { red: 0.78, green: 0.82, blue: 0.99 }; // #c7d2fe

  // Format Title Slide (Initial Slide)
  if (initialSlideId) {
    // Slide 1 Background
    requests.push({
      updatePageProperties: {
        objectId: initialSlideId,
        pageProperties: {
          pageBackgroundFill: {
            solidFill: { color: { rgbColor: darkNavyRgb } }
          }
        },
        fields: "pageBackgroundFill"
      }
    });

    // Title Box
    const titleShapeId = `title_shape_${timestamp}`;
    requests.push({
      createShape: {
        objectId: titleShapeId,
        shapeType: "TEXT_BOX",
        elementProperties: {
          pageObjectId: initialSlideId,
          size: { width: { magnitude: 8229600, unit: "EMU" }, height: { magnitude: 1800000, unit: "EMU" } },
          transform: { scaleX: 1, scaleY: 1, translateX: 457200, translateY: 1371600, unit: "EMU" }
        }
      }
    });

    requests.push({
      insertText: {
        objectId: titleShapeId,
        text: `${presentation.title}\n`
      }
    });

    requests.push({
      updateTextStyle: {
        objectId: titleShapeId,
        style: {
          bold: true,
          fontSize: { magnitude: 34, unit: "PT" },
          fontFamily: "Arial",
          foregroundColor: { opaqueColor: { rgbColor: whiteRgb } }
        },
        fields: "bold,fontSize,fontFamily,foregroundColor"
      }
    });

    // Subtitle Box
    if (presentation.subtitle) {
      const subShapeId = `sub_shape_${timestamp}`;
      requests.push({
        createShape: {
          objectId: subShapeId,
          shapeType: "TEXT_BOX",
          elementProperties: {
            pageObjectId: initialSlideId,
            size: { width: { magnitude: 8229600, unit: "EMU" }, height: { magnitude: 1000000, unit: "EMU" } },
            transform: { scaleX: 1, scaleY: 1, translateX: 457200, translateY: 3200000, unit: "EMU" }
          }
        }
      });

      requests.push({
        insertText: {
          objectId: subShapeId,
          text: `${presentation.subtitle}\n`
        }
      });

      requests.push({
        updateTextStyle: {
          objectId: subShapeId,
          style: {
            italic: true,
            fontSize: { magnitude: 18, unit: "PT" },
            fontFamily: "Arial",
            foregroundColor: { opaqueColor: { rgbColor: lightIndigoRgb } }
          },
          fields: "italic,fontSize,fontFamily,foregroundColor"
        }
      });
    }

    // Top Accent Bar
    const accentBarId = `accent_bar_${timestamp}`;
    requests.push({
      createShape: {
        objectId: accentBarId,
        shapeType: "RECTANGLE",
        elementProperties: {
          pageObjectId: initialSlideId,
          size: { width: { magnitude: 8229600, unit: "EMU" }, height: { magnitude: 91440, unit: "EMU" } },
          transform: { scaleX: 1, scaleY: 1, translateX: 457200, translateY: 914400, unit: "EMU" }
        }
      }
    });

    requests.push({
      updateShapeProperties: {
        objectId: accentBarId,
        shapeProperties: {
          shapeBackgroundFill: { solidFill: { color: { rgbColor: indigoRgb } } }
        },
        fields: "shapeBackgroundFill"
      }
    });
  }

  // Create Content Slides
  presentation.slides?.forEach((slide, idx) => {
    const slideObjectId = `slide_${idx + 1}_${timestamp}`;

    // Create Blank Slide
    requests.push({
      createSlide: {
        objectId: slideObjectId,
        insertionIndex: idx + 1,
        slideLayoutPath: { predefinedLayout: "BLANK" }
      }
    });

    // Slide Background
    requests.push({
      updatePageProperties: {
        objectId: slideObjectId,
        pageProperties: {
          pageBackgroundFill: {
            solidFill: { color: { rgbColor: darkNavyRgb } }
          }
        },
        fields: "pageBackgroundFill"
      }
    });

    // Top Accent Line
    const topBarId = `top_bar_${idx}_${timestamp}`;
    requests.push({
      createShape: {
        objectId: topBarId,
        shapeType: "RECTANGLE",
        elementProperties: {
          pageObjectId: slideObjectId,
          size: { width: { magnitude: 8229600, unit: "EMU" }, height: { magnitude: 45720, unit: "EMU" } },
          transform: { scaleX: 1, scaleY: 1, translateX: 457200, translateY: 457200, unit: "EMU" }
        }
      }
    });
    requests.push({
      updateShapeProperties: {
        objectId: topBarId,
        shapeProperties: {
          shapeBackgroundFill: { solidFill: { color: { rgbColor: indigoRgb } } }
        },
        fields: "shapeBackgroundFill"
      }
    });

    // Slide Number & Badge
    const badgeShapeId = `badge_${idx}_${timestamp}`;
    requests.push({
      createShape: {
        objectId: badgeShapeId,
        shapeType: "TEXT_BOX",
        elementProperties: {
          pageObjectId: slideObjectId,
          size: { width: { magnitude: 3000000, unit: "EMU" }, height: { magnitude: 360000, unit: "EMU" } },
          transform: { scaleX: 1, scaleY: 1, translateX: 457200, translateY: 550000, unit: "EMU" }
        }
      }
    });
    requests.push({
      insertText: {
        objectId: badgeShapeId,
        text: `SLIDE ${slide.slideNumber} OF ${presentation.slides.length}`
      }
    });
    requests.push({
      updateTextStyle: {
        objectId: badgeShapeId,
        style: {
          bold: true,
          fontSize: { magnitude: 10, unit: "PT" },
          fontFamily: "Arial",
          foregroundColor: { opaqueColor: { rgbColor: lightIndigoRgb } }
        },
        fields: "bold,fontSize,fontFamily,foregroundColor"
      }
    });

    // Slide Title (Left Column)
    const headerShapeId = `header_${idx}_${timestamp}`;
    requests.push({
      createShape: {
        objectId: headerShapeId,
        shapeType: "TEXT_BOX",
        elementProperties: {
          pageObjectId: slideObjectId,
          size: { width: { magnitude: 4800000, unit: "EMU" }, height: { magnitude: 731520, unit: "EMU" } },
          transform: { scaleX: 1, scaleY: 1, translateX: 457200, translateY: 950000, unit: "EMU" }
        }
      }
    });
    requests.push({
      insertText: {
        objectId: headerShapeId,
        text: `${slide.title}\n`
      }
    });
    requests.push({
      updateTextStyle: {
        objectId: headerShapeId,
        style: {
          bold: true,
          fontSize: { magnitude: 20, unit: "PT" },
          fontFamily: "Arial",
          foregroundColor: { opaqueColor: { rgbColor: whiteRgb } }
        },
        fields: "bold,fontSize,fontFamily,foregroundColor"
      }
    });

    // Bullet Points Container (Left Column)
    if (slide.bulletPoints && slide.bulletPoints.length > 0) {
      const bulletShapeId = `bullets_${idx}_${timestamp}`;
      const bulletsText = slide.bulletPoints.map(b => `•  ${b}`).join("\n\n") + "\n";

      requests.push({
        createShape: {
          objectId: bulletShapeId,
          shapeType: "TEXT_BOX",
          elementProperties: {
            pageObjectId: slideObjectId,
            size: { width: { magnitude: 4800000, unit: "EMU" }, height: { magnitude: 2194560, unit: "EMU" } },
            transform: { scaleX: 1, scaleY: 1, translateX: 457200, translateY: 1800000, unit: "EMU" }
          }
        }
      });
      requests.push({
        insertText: {
          objectId: bulletShapeId,
          text: bulletsText
        }
      });
      requests.push({
        updateTextStyle: {
          objectId: bulletShapeId,
          style: {
            fontSize: { magnitude: 13, unit: "PT" },
            fontFamily: "Arial",
            foregroundColor: { opaqueColor: { rgbColor: whiteRgb } }
          },
          fields: "fontSize,fontFamily,foregroundColor"
        }
      });
    }

    // RIGHT COLUMN: VISUAL GRAPHIC CONTAINER (ON EVERY SLIDE)
    const graphicBoxId = `graphic_box_${idx}_${timestamp}`;
    requests.push({
      createShape: {
        objectId: graphicBoxId,
        shapeType: "ROUNDED_RECTANGLE",
        elementProperties: {
          pageObjectId: slideObjectId,
          size: { width: { magnitude: 3300000, unit: "EMU" }, height: { magnitude: 3000000, unit: "EMU" } },
          transform: { scaleX: 1, scaleY: 1, translateX: 5400000, translateY: 950000, unit: "EMU" }
        }
      }
    });
    requests.push({
      updateShapeProperties: {
        objectId: graphicBoxId,
        shapeProperties: {
          shapeBackgroundFill: { solidFill: { color: { rgbColor: cardBgRgb } } },
          outline: {
            outlineFill: { solidFill: { color: { rgbColor: indigoRgb } } },
            weight: { magnitude: 1, unit: "PT" }
          }
        },
        fields: "shapeBackgroundFill,outline"
      }
    });

    const graphicTitle = slide.graphicTitle || (slide.graphicType ? `${slide.graphicType.toUpperCase()} INFOGRAPHIC` : "VISUAL CONCEPT ARCHITECTURE");
    const elements = slide.graphicElements && slide.graphicElements.length > 0
      ? slide.graphicElements
      : (slide.bulletPoints || []).slice(0, 3).map((b, i) => ({
          label: b.split(/[:\-–]/)[0]?.trim() || `Key Dimension ${i + 1}`,
          description: b.split(/[:\-–]/)[1]?.trim() || b
        }));

    const graphicContentText = `📊 ${graphicTitle}\n\n` + elements.slice(0, 3).map((el, elI) => `[${elI + 1}] ${el.label}${el.description ? `\n   ${el.description.slice(0, 70)}` : ''}`).join('\n\n');

    requests.push({
      insertText: {
        objectId: graphicBoxId,
        text: graphicContentText
      }
    });
    requests.push({
      updateTextStyle: {
        objectId: graphicBoxId,
        style: {
          fontSize: { magnitude: 10, unit: "PT" },
          fontFamily: "Arial",
          foregroundColor: { opaqueColor: { rgbColor: lightIndigoRgb } }
        },
        fields: "fontSize,fontFamily,foregroundColor"
      }
    });

    // Key Takeaway Bottom Card
    if (slide.keyTakeaway) {
      const takeawayShapeId = `takeaway_${idx}_${timestamp}`;
      requests.push({
        createShape: {
          objectId: takeawayShapeId,
          shapeType: "ROUNDED_RECTANGLE",
          elementProperties: {
            pageObjectId: slideObjectId,
            size: { width: { magnitude: 8229600, unit: "EMU" }, height: { magnitude: 600000, unit: "EMU" } },
            transform: { scaleX: 1, scaleY: 1, translateX: 457200, translateY: 4150000, unit: "EMU" }
          }
        }
      });
      requests.push({
        updateShapeProperties: {
          objectId: takeawayShapeId,
          shapeProperties: {
            shapeBackgroundFill: { solidFill: { color: { rgbColor: cardBgRgb } } },
            outline: {
              outlineFill: { solidFill: { color: { rgbColor: indigoRgb } } },
              weight: { magnitude: 1, unit: "PT" }
            }
          },
          fields: "shapeBackgroundFill,outline"
        }
      });
      requests.push({
        insertText: {
          objectId: takeawayShapeId,
          text: `💡 KEY TAKEAWAY: ${slide.keyTakeaway}`
        }
      });
      requests.push({
        updateTextStyle: {
          objectId: takeawayShapeId,
          style: {
            bold: true,
            fontSize: { magnitude: 12, unit: "PT" },
            fontFamily: "Arial",
            foregroundColor: { opaqueColor: { rgbColor: lightIndigoRgb } }
          },
          fields: "bold,fontSize,fontFamily,foregroundColor"
        }
      });
    }
  });

  // 3. Send batchUpdate to Google Slides API
  if (requests.length > 0) {
    const updateRes = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requests }),
    });

    if (!updateRes.ok) {
      console.warn("Google Slides batchUpdate notice:", await updateRes.text().catch(() => ""));
    }
  }

  const presentationUrl = `https://docs.google.com/presentation/d/${presentationId}/edit`;
  return { presentationId, presentationUrl };
}

/**
 * Fallback / Alternative route for Google Slides:
 * Opens Google Slides in the browser (slides.new) and provides instructions or auto-downloads .pptx.
 */
export function openGoogleSlidesWebUrl(): string {
  return "https://slides.new";
}
